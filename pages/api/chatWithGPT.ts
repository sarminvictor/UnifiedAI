import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/auth.config';
import prisma from '@/lib/prismaClient';
import { OpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { GoogleGenerativeAI } from "@langchain/google-genai";
import { DeepSeek } from "@langchain/deepseek";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";

// Define token rates as a global constant
const TOKEN_RATES: Record<string, number> = {
  "ChatGPT": 1278,     // 1 credit = 1,278 tokens (GPT-4o)
  "Claude": 888,       // 1 credit = 888 tokens (Claude 3.5 Sonnet)
  "Gemini": 42624,     // 1 credit = 42,624 tokens
  "DeepSeek": 23164,   // 1 credit = 23,164 tokens
};

const getAIModel = (modelName: string) => {
  switch (modelName) {
    case "ChatGPT":
      return new OpenAI({ openAIApiKey: process.env.OPENAI_API_KEY, temperature: 0.7, maxTokens: 500 });
    case "Claude":
      return new ChatAnthropic({ anthropicApiKey: process.env.ANTHROPIC_API_KEY, temperature: 0.7 });
    case "Gemini":
      return new GoogleGenerativeAI({ googleApiKey: process.env.GOOGLE_API_KEY, temperature: 0.7 });
    case "DeepSeek":
      return new DeepSeek({ deepSeekApiKey: process.env.DEEPSEEK_API_KEY, temperature: 0.7 });
    default:
      throw new Error("Unsupported AI Model");
  }
};

const calculateCredits = (model: string, tokensUsed: number): number => {
  // Get tokens per credit for the model
  const tokensPerCredit = TOKEN_RATES[model];
  if (!tokensPerCredit) {
    console.warn(`⚠️ No token rate found for model ${model}, using GPT-4o rate`);
    return tokensUsed / TOKEN_RATES["ChatGPT"]; // Default to GPT-4o rate
  }

  // Calculate credits with high precision
  const credits = tokensUsed / tokensPerCredit;
  console.log(`💰 Credit calculation for ${model}:`, {
    tokensUsed,
    tokensPerCredit,
    credits: credits.toFixed(6)
  });

  return credits;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { chatId, userMessage, modelName } = req.body;
  if (!chatId || !userMessage || !modelName) {
    return res.status(400).json({ success: false, message: 'chatId, userMessage, and modelName are required' });
  }

  try {
    console.log("🔹 Checking user credits...");

    // Early credit check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits_remaining: true } // Only select needed field
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Strict credit check
    if (user.credits_remaining <= 0) {
      console.log(`❌ Insufficient credits for user ${session.user.id}: ${user.credits_remaining}`);
      return res.status(403).json({
        success: false,
        message: 'Insufficient credits. Please top up to continue.',
        redirect: '/subscribe',
        credits_remaining: user.credits_remaining
      });
    }

    console.log(`✅ User has ${user.credits_remaining} credits remaining`);

    // Fetch chat history
    let chat = await prisma.chat.findUnique({ where: { chat_id: chatId } });
    if (!chat) {
      chat = await prisma.chat.create({
        data: { chat_id: chatId, chat_title: 'New Chat', user_id: session.user.id, created_at: new Date(), updated_at: new Date(), deleted: false }
      });
    }

    const previousMessages = await prisma.chatHistory.findMany({
      where: { chat_id: chatId },
      orderBy: { timestamp: 'asc' },
      take: 10
    });

    const formattedMessages = previousMessages.map(msg => ["user", msg.user_input] as [string, string]);
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "You are an AI assistant. Keep responses concise and helpful."],
      ...formattedMessages,
      ["user", userMessage]
    ]);

    const llm = getAIModel(modelName);
    const chain = new LLMChain({ llm, prompt });

    console.log(`🔹 Sending message to ${modelName}...`);

    let tokensUsed = 0, promptTokens = 0, completionTokens = 0;
    let response;

    if (modelName === "ChatGPT") {
      const callbacks = {
        handleLLMEnd: (output: any) => {
          tokensUsed = output.llmOutput?.tokenUsage?.totalTokens || 0;
          promptTokens = output.llmOutput?.tokenUsage?.promptTokens || 0;
          completionTokens = output.llmOutput?.tokenUsage?.completionTokens || 0;
          
          // Detailed token logging
          console.log("🔢 Token Usage Details:", {
            total: tokensUsed,
            prompt: promptTokens,
            completion: completionTokens,
            model: modelName
          });
        }
      };
      response = await chain.call({}, { callbacks: [callbacks] });
    } else {
      // For non-OpenAI models, estimate tokens
      response = await chain.call({});
      // Estimate tokens based on response length
      tokensUsed = Math.ceil((userMessage.length + (response.text?.length || 0)) / 4);
      promptTokens = Math.ceil(userMessage.length / 4);
      completionTokens = Math.ceil((response.text?.length || 0) / 4);
    }

    const apiResponse = response.text?.trim() || "No response received";

    // Calculate and log credits with token details
    const creditsDeducted = calculateCredits(modelName, tokensUsed);
    console.log(`💰 Credit Calculation:`, {
      model: modelName,
      tokensUsed,
      promptTokens,
      completionTokens,
      creditsDeducted: creditsDeducted.toFixed(6),
      tokensPerCredit: TOKEN_RATES[modelName] || TOKEN_RATES["ChatGPT"]
    });

    // ✅ Get API details for usage log first
    const api = await prisma.aPI.findUnique({ where: { api_name: modelName } });
    if (!api) {
      throw new Error("API model not found");
    }

    // Update credit calculation and deduction in transaction
    if (creditsDeducted > user.credits_remaining) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient credits for this request.',
        redirect: '/subscribe',
        credits_remaining: user.credits_remaining,
        credits_needed: creditsDeducted
      });
    }

    // ✅ Use prisma transaction with exact values (not rounded)
    const [userMessageEntry, aiMessageEntry, updatedUser] = await prisma.$transaction([
      // Create user message (unchanged)
      prisma.chatHistory.create({
        data: {
          chat: { connect: { chat_id: chatId } },
          user_input: userMessage,
          api_response: "",
          input_type: 'Text',
          output_type: 'Text',
          timestamp: new Date(),
          context_id: chatId,
        },
      }),

      // Create AI response (unchanged)
      prisma.chatHistory.create({
        data: {
          chat: { connect: { chat_id: chatId } },
          user_input: "",
          api_response: apiResponse,
          input_type: 'Text',
          output_type: 'Text',
          timestamp: new Date(),
          context_id: chatId,
          model: modelName,
          credits_deducted: creditsDeducted, // Exact value
        },
      }),

      // Update user credits - Remove Math.ceil()
      prisma.user.update({
        where: { id: session.user.id },
        data: { 
          credits_remaining: { 
            decrement: creditsDeducted // Use exact value, not rounded
          } 
        },
        select: { credits_remaining: true }
      })
    ]);

    // ✅ Create API usage log after messages are created
    await prisma.aPIUsageLog.create({
      data: {
        user: { connect: { id: session.user.id } },
        chat: { connect: { chat_id: chatId } },
        apis: { connect: { api_id: api.api_id } },
        tokens_used: tokensUsed,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        credits_deducted: creditsDeducted,
        api_cost: api.pricing_per_token * tokensUsed,
        usage_type: "AI",
        input_type: "Text",
        output_type: "Text",
        messages_used: [userMessageEntry.history_id, aiMessageEntry.history_id],
      },
    });

    console.log(`✅ Final Usage Stats:`, {
      model: modelName,
      tokensTotal: tokensUsed,
      tokensPrompt: promptTokens,
      tokensCompletion: completionTokens,
      creditsDeducted: creditsDeducted.toFixed(6),
      remainingCredits: updatedUser.credits_remaining.toFixed(6)
    });

    console.log(`✅ Successfully stored chat history and usage log`);
    console.log(`✅ Updated user credits: -${creditsDeducted} deducted, ${updatedUser.credits_remaining} remaining`);

    return res.status(200).json({
      success: true,
      userMessage: userMessageEntry,
      aiMessage: aiMessageEntry,
      model: modelName,
      tokensUsed,
      creditsDeducted,
      credits_remaining: updatedUser.credits_remaining
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
}
