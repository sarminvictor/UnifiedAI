import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/auth.config';
import prisma from '@/lib/prismaClient';
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import { BufferMemory } from "langchain/memory";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { ConversationSummaryMemory } from "langchain/memory";
import { Decimal } from '@prisma/client/runtime/library';
import { sanitizeString, sanitizeNumber } from '@/utils/sanitize';
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

// Update token rates to match specifications exactly
const TOKEN_RATES: Record<string, number> = {
  "ChatGPT": 1278,    // 1 credit = 1,278 GPT-4o tokens
  "Gemini": 42624,    // 1 credit = 42,624 Gemini tokens
  "DeepSeek": 23164,  // 1 credit = 23,164 DeepSeek tokens
  "Claude": 888       // 1 credit = 888 Claude 3.5 Sonnet tokens
};

// Update threshold constant
const SUMMARY_THRESHOLD = 10; // Generate new summary every 10 messages

const getAIModel = (modelName: string) => {
  const config = { temperature: 0.7 };
  
  switch (modelName) {
    case "ChatGPT":
      return new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: "gpt-4",
        temperature: config.temperature,
        maxTokens: 1024,
      });
    case "Claude":
      return new ChatAnthropic({ 
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        temperature: config.temperature
      });
    case "Gemini":
      return new ChatGoogleGenerativeAI({ 
        apiKey: process.env.GOOGLE_API_KEY,
        temperature: config.temperature
      });
    case "DeepSeek":
      return new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: "gpt-3.5-turbo",
        temperature: config.temperature,
        maxTokens: 750,
      });
    default:
      throw new Error("Unsupported AI Model");
  }
};

const calculateCredits = (model: string, tokensUsed: string): string => {
  const tokensPerCredit = TOKEN_RATES[model] || TOKEN_RATES["ChatGPT"];
  return (parseInt(tokensUsed) / tokensPerCredit).toFixed(6);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { chatId, userMessage, modelName } = req.body;

  try {
    // Update chat fetch to include summary
    const existingChat = await prisma.chat.findUnique({
      where: { chat_id: chatId },
      select: { 
        deleted: true, 
        user_id: true,
        chat_summary: true
      }
    });

    if (!existingChat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }
    if (existingChat.deleted) {
      return res.status(403).json({ success: false, message: 'Cannot send messages to deleted chats' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!chatId || !userMessage || !modelName) {
      return res.status(400).json({ success: false, message: 'chatId, userMessage, and modelName are required' });
    }

    console.log("🔹 Checking user credits...");
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits_remaining: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentCredits = new Decimal(user.credits_remaining);
    if (currentCredits.equals(0)) {
      return res.status(403).json({ success: false, message: 'Insufficient credits. Please top up to continue.', redirect: '/subscribe' });
    }

    console.log(`✅ User has ${currentCredits.toString()} credits remaining`);

    // Store user message in chat history
    const userMessageEntry = await prisma.chatHistory.create({
      data: {
        chat: { connect: { chat_id: chatId } },
        user_input: sanitizeString(userMessage) || '',
        api_response: '',
        input_type: 'Text',
        output_type: 'Text',
        timestamp: new Date(),
        context_id: chatId,
        credits_deducted: '0',
      },
    });

    console.log("🔹 Fetching conversation history...");
    
    // Fetch previous messages and create context
    const previousMessages = await prisma.chatHistory.findMany({
      where: { chat_id: chatId },
      orderBy: { timestamp: 'asc' },
      take: 10
    });

    // Create the prompt template with properly typed messages
    const messages = [
      new SystemMessage(
        `You are ChatGPT, a large language model trained by OpenAI.
        ${existingChat.chat_summary ? `\nContext from previous conversation: ${existingChat.chat_summary}` : ''}
        Follow instructions carefully. Provide clear, detailed, and conversational responses.
        Think step by step when necessary. Avoid unnecessary formatting or extra symbols.
        If the user asks a question, respond naturally and conversationally.
        If the input is ambiguous, ask clarifying questions instead of making assumptions.
        Use natural language rather than robotic, short responses.`
      ),
      ...previousMessages.map(msg => 
        msg.user_input 
          ? new HumanMessage(msg.user_input)
          : new AIMessage(msg.api_response || "")
      ),
      new HumanMessage(userMessage)
    ];

    const prompt = ChatPromptTemplate.fromMessages(messages);

    // Create conversation memory with properly typed messages
    const memory = new BufferMemory({
      chatHistory: new ChatMessageHistory(
        previousMessages.map(msg => 
          msg.user_input 
            ? new HumanMessage(msg.user_input)
            : new AIMessage(msg.api_response || "")
        )
      ),
      returnMessages: true,
    });

    // Initialize model and chain with memory
    const llm = getAIModel(modelName);
    const chain = new LLMChain({
      llm,
      prompt,
      memory,
      verbose: true // Add verbose for debugging
    });

    console.log(`🔹 Sending message to ${modelName}...`);
    const response = await chain.call({ input: userMessage });

    const cleanResponse = sanitizeString(response.text?.trim());
    if (!cleanResponse) {
      throw new Error('Invalid API response content');
    }

    console.log('✅ AI Response:', cleanResponse.substring(0, 50));

    // Calculate tokens and costs first
    const promptTokens = Math.ceil(userMessage.length / 4).toString();
    const completionTokens = Math.ceil((response.text?.length || 0) / 4).toString();
    const totalTokens = (parseInt(promptTokens) + parseInt(completionTokens)).toString();
    const creditsDeducted = calculateCredits(modelName, totalTokens);
    const creditsToDeduct = new Decimal(creditsDeducted);

    // Get API details and calculate cost
    const api = await prisma.aPI.findUnique({ 
      where: { api_name: modelName },
      select: { api_id: true, pricing_per_token: true }
    });

    if (!api) {
      throw new Error('API model not found');
    }

    const apiCost = (parseFloat(api.pricing_per_token) * parseInt(totalTokens)).toFixed(6);

    // Check credits before proceeding
    if (creditsToDeduct.greaterThan(currentCredits)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient credits for this request.',
        redirect: '/subscribe',
        credits_remaining: user.credits_remaining,
        credits_needed: creditsDeducted
      });
    }

    // Fix Decimal arithmetic
    const currentCreditsNum = parseFloat(currentCredits.toString());
    const creditsToDeductNum = parseFloat(creditsDeducted);
    const newCredits = (currentCreditsNum - creditsToDeductNum).toFixed(6);

    // Store messages and update credits in a single transaction with updated timestamp
    const [messageAI, updatedUser] = await prisma.$transaction([
      // Create AI message only (remove duplicate user message creation)
      prisma.chatHistory.create({
        data: {
          chat: { connect: { chat_id: chatId } },
          user_input: '',
          api_response: cleanResponse,
          input_type: 'Text',
          output_type: 'Text',
          timestamp: new Date(),
          context_id: chatId,
          model: modelName,
          credits_deducted: creditsDeducted,
        },
      }),

      // Update user credits with proper string value
      prisma.user.update({
        where: { id: session.user.id },
        data: { 
          credits_remaining: newCredits
        },
        select: { credits_remaining: true }
      }),

      // Update chat timestamp
      prisma.chat.update({
        where: { chat_id: chatId },
        data: {
          updated_at: new Date()
        }
      })
    ]);

    // Create API usage log with all required fields
    await prisma.aPIUsageLog.create({
      data: {
        user: { connect: { id: session.user.id } },
        chat: { connect: { chat_id: chatId } },
        apis: { connect: { api_id: api.api_id } },
        tokens_used: totalTokens,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        credits_deducted: creditsDeducted,
        api_cost: apiCost,
        usage_type: "AI",
        input_type: "Text",
        output_type: "Text",
        messages_used: [userMessageEntry.history_id, messageAI.history_id],
      },
    });

    // After the API response and transactions, handle summary updates
    if (previousMessages.length >= SUMMARY_THRESHOLD) {
      console.log("🔹 Generating new conversation summary...");
      
      const summaryChain = new LLMChain({
        llm,
        prompt: ChatPromptTemplate.fromMessages([
          new SystemMessage("Generate a brief summary of this conversation that captures the main topics and key points discussed:"),
          ...previousMessages.map(msg => 
            msg.user_input 
              ? new HumanMessage(msg.user_input)
              : new AIMessage(msg.api_response || "")
          ),
          new HumanMessage(userMessage),
          new AIMessage(cleanResponse)
        ])
      });

      const summaryResponse = await summaryChain.call({});
      const newSummary = sanitizeString(summaryResponse.text?.trim());
      
      if (newSummary) {
        console.log("✅ New Summary:", newSummary);
        
        // Update chat summary
        await prisma.chat.update({
          where: { chat_id: chatId },
          data: { 
            chat_summary: newSummary,
            updated_at: new Date()
          }
        });
      }
    } else {
      // Only update timestamp if no summary was generated
      await prisma.chat.update({
        where: { chat_id: chatId },
        data: {
          updated_at: new Date()
        }
      });
    }

    return res.status(200).json({
      success: true,
      userMessage: userMessageEntry,
      aiMessage: messageAI,
      model: modelName,
      tokensUsed: totalTokens,
      creditsDeducted,
      credits_remaining: updatedUser.credits_remaining
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error occurred' });
  }
}
