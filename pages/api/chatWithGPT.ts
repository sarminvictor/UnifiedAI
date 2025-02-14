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
import { v4 as uuidv4 } from 'uuid';

const getAIModel = (modelName: string) => {
  switch (modelName) {
    case "ChatGPT":
      return new OpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        temperature: 0.7,
        maxTokens: 500,
      });
    case "Claude":
      return new ChatAnthropic({
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        temperature: 0.7,
      });
    case "Gemini":
      return new GoogleGenerativeAI({
        googleApiKey: process.env.GOOGLE_API_KEY,
        temperature: 0.7,
      });
    case "DeepSeek":
      return new DeepSeek({
        deepSeekApiKey: process.env.DEEPSEEK_API_KEY,
        temperature: 0.7,
      });
    default:
      throw new Error("Unsupported AI Model");
  }
};

const calculateCredits = (model: string, tokensUsed: number): number => {
  const tokenRates: Record<string, number> = {
    "GPT-4o": 1278,
    "GPT-4o mini": 21312,
    "Gemini": 42624,
    "DeepSeek": 23164,
    "Claude 3.5 Sonnet": 888,
  };
  const rate = tokenRates[model] || 1;
  return tokensUsed > 0 ? tokensUsed / rate : 1;
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
    console.log("🔹 Fetching chat history for context...");

    let chat = await prisma.chat.findUnique({ where: { chat_id: chatId } });
    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          chat_id: chatId,
          chat_title: 'New Chat',
          user_id: session.user.id,
          created_at: new Date(),
          updated_at: new Date(),
          deleted: false,
        },
      });
    }

    let chatSummary = chat?.chat_summary || "";
    
    // ✅ Fetch and extract chat history
    const previousMessages = await prisma.chatHistory.findMany({
      where: { chat_id: chatId },
      orderBy: { timestamp: 'asc' },
      take: 10, // Keep last 10 messages for context
    });

    // ✅ Initialize message IDs array at the start
    let contextMessageIds = previousMessages.map(msg => msg.history_id);

    console.log("🔹 Initial Chat Context IDs:", contextMessageIds);

    const formattedMessages = previousMessages.map(msg => ["user", msg.user_input] as [string, string]);
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "You are an AI assistant. Keep responses concise and helpful. Maintain context from the summary."],
      ["system", `Conversation Summary: ${chatSummary}`],
      ...formattedMessages,
      ["user", userMessage]
    ]);

    const llm = getAIModel(modelName);
    const chain = new LLMChain({ llm, prompt });

    console.log(`🔹 Sending message to ${modelName}...`);

    const userMessageEntry = await prisma.chatHistory.create({
      data: {
        chat: { connect: { chat_id: chatId } },
        user_input: userMessage,
        api_response: "",
        input_type: 'Text',
        output_type: 'Text',
        timestamp: new Date(),
        context_id: chatId,
      },
    });

    let tokensUsed = 0, promptTokens = 0, completionTokens = 0;
    let response;

    if (modelName === "ChatGPT") {
      const callbacks = {
        handleLLMEnd: (output: any) => {
          tokensUsed = output.llmOutput?.tokenUsage?.totalTokens || 0;
          promptTokens = output.llmOutput?.tokenUsage?.promptTokens || 0;
          completionTokens = output.llmOutput?.tokenUsage?.completionTokens || 0;
          console.log("✅ Token usage in callback:", {
            total: tokensUsed,
            prompt: promptTokens,
            completion: completionTokens
          });
        }
      };

      response = await chain.call({}, { callbacks: [callbacks] });
    } else {
      response = await chain.call({});
    }

    const apiResponse = response.text?.trim() || "No response received";

    console.log(`✅ ${modelName} Response: ${apiResponse}`);

    // ✅ ADD EXPLICIT LOGGING FOR TOKEN USAGE
    console.log("🔹 Full Response Object:", JSON.stringify(response, null, 2));

    // ✅ Ensure API details exist before referencing
    const api = await prisma.aPI.findUnique({ where: { api_name: modelName } });

    if (!api) {
      console.error("❌ API Model not found in DB");
      return res.status(400).json({ success: false, message: "Invalid API model" });
    }

    // ✅ Use the values from the callback
    const tokenUsage = {
      totalTokens: tokensUsed,
      promptTokens: promptTokens,
      completionTokens: completionTokens
    };

    console.log(`🔹 Token Usage:`, tokenUsage);

    // ✅ Convert tokens to credits and LOG IT - MOVE THIS UP
    const creditsDeducted = calculateCredits(modelName, tokensUsed);
    console.log(`🔹 Credits Deducted: ${creditsDeducted}`);

    // ✅ Calculate API cost and LOG IT
    const apiCost = api.pricing_per_token
      ? parseFloat((tokensUsed * api.pricing_per_token).toFixed(6))
      : 0;

    const aiMessageEntry = await prisma.chatHistory.create({
      data: {
        chat: { connect: { chat_id: chatId } },
        user_input: "",
        api_response: apiResponse,
        input_type: 'Text',
        output_type: 'Text',
        timestamp: new Date(),
        context_id: chatId,
        model: modelName,  // ✅ Store model name
        credits_deducted: creditsDeducted, // Now creditsDeducted is defined
      },
    });

    // ✅ Add current message IDs to context
    contextMessageIds = [
      ...contextMessageIds,
      userMessageEntry.history_id,
      aiMessageEntry.history_id
    ];

    console.log("🔹 Complete message ID context:", contextMessageIds);

    // ✅ Store message IDs in APIUsageLog
    await prisma.aPIUsageLog.create({
      data: {
        user: { connect: { id: session.user.id } },
        chat: { connect: { chat_id: chatId } },
        apis: { connect: { api_id: api.api_id } },
        tokens_used: tokensUsed,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        credits_deducted: creditsDeducted,
        api_cost: apiCost,
        usage_type: "AI",
        input_type: "Text",
        output_type: "Text",
        messages_used: contextMessageIds, // Store only message IDs
      },
    });

    console.log(`✅ Usage Logged in DB: Tokens Used: ${tokensUsed}, Credits Deducted: ${creditsDeducted}, API Cost: ${apiCost}`);

    return res.status(200).json({
      success: true,
      userMessage: userMessageEntry,
      aiMessage: aiMessageEntry,
      model: modelName,
      tokensUsed: tokensUsed,
      creditsDeducted,
    });

  } catch (error) {
    console.error('❌ Error calling AI model:', error);
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
}
