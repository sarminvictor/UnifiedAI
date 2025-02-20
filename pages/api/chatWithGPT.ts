import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/auth.config';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import { BufferMemory } from "langchain/memory";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { Decimal } from '@prisma/client/runtime/library';
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { AIModelFactory } from '@/services/ai/modelFactory';
import { TokenCalculator } from '@/services/ai/tokenCalculator';
import { SummaryManager } from '@/services/ai/summaryManager';
import { ChatService } from '@/services/db/chatService';
import { UserService } from '@/services/db/userService';
import { APIUsageService } from '@/services/db/apiUsageService';
import { ModelName, ChatMessage } from '@/types/ai.types';
import { SYSTEM_PROMPTS } from '@/constants/ai.constants';
import { ErrorHandler, ErrorCodes, AppError } from '@/utils/errorHandler';
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

interface SummaryConfig {
  llm: BaseChatModel;
  previousMessages: ChatMessage[];
  currentUserMessage: string;
  currentAiResponse: string;
}

function createChain(llm: BaseChatModel, messages: (SystemMessage | HumanMessage | AIMessage)[], previousMessages: ChatMessage[]) {
  return new LLMChain({
    llm,
    prompt: ChatPromptTemplate.fromMessages(messages),
    memory: new BufferMemory({
      chatHistory: new ChatMessageHistory(
        previousMessages.map(msg => 
          msg.user_input 
            ? new HumanMessage(msg.user_input)
            : new AIMessage(msg.api_response || "")
        )
      ),
      returnMessages: true,
    }),
    verbose: false
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    throw new AppError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const { chatId, userMessage, modelName } = req.body as { 
      chatId: string; 
      userMessage: string; 
      modelName: ModelName 
    };

    // Validate session
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
    }

    // Validate inputs
    if (!chatId || !userMessage || !modelName) {
      throw new AppError('Missing required fields', 400, ErrorCodes.INVALID_INPUT);
    }

    // Get chat and user data using services
    const [existingChat, user] = await Promise.all([
      ChatService.findChat(chatId),
      UserService.findUser(session.user.id)
    ]);

    if (!existingChat || !user) {
      throw new AppError('Chat or user not found', 404, ErrorCodes.CHAT_NOT_FOUND);
    }

    if (existingChat.deleted) {
      throw new AppError('Cannot send messages to deleted chats', 403, ErrorCodes.DELETED_CHAT);
    }

    // Check credits using UserService validation
    const currentCredits = new Decimal(user.credits_remaining);
    const requiredCredits = new Decimal('0.1'); // Minimum required credits
    
    if (!UserService.validateCredits(currentCredits, requiredCredits)) {
      throw new AppError('Insufficient credits', 403, ErrorCodes.INSUFFICIENT_CREDITS);
    }

    // Store user message and get chat history
    const userMessageEntry = await ChatService.createUserMessage(chatId, userMessage);
    const previousMessages = await ChatService.getPreviousMessages(chatId);

    // Initialize AI components with simplified chain creation
    const llm = AIModelFactory.createModel(modelName);
    const messages = [
      new SystemMessage(
        `${SYSTEM_PROMPTS.DEFAULT_CHAT}
        ${existingChat.chat_summary ? `\nContext from previous conversation: ${existingChat.chat_summary}` : ''}`
      ),
      ...previousMessages.map((msg: ChatMessage) => 
        msg.user_input 
          ? new HumanMessage(msg.user_input)
          : new AIMessage(msg.api_response || "")
      ),
      new HumanMessage(userMessage)
    ];

    const chain = createChain(llm, messages, previousMessages);

    // Get AI response
    const response = await chain.call({ input: userMessage });
    if (!response.text) {
      throw new AppError('Invalid API response', 500, ErrorCodes.API_ERROR);
    }

    // Calculate tokens and credits
    const tokenInfo = TokenCalculator.calculateMessageTokens(userMessage, response.text);
    const creditsDeducted = TokenCalculator.calculateCredits(modelName, parseInt(tokenInfo.totalTokens));
    const newCredits = UserService.calculateNewCredits(user.credits_remaining, creditsDeducted);

    // Create AI message and update user credits
    const [messageAI, updatedUser] = await Promise.all([
      ChatService.createAIMessage(chatId, response.text, modelName, creditsDeducted),
      UserService.updateUserCredits(session.user.id, newCredits)
    ]);

    // Log API usage
    await APIUsageService.logAPIUsage({
      userId: session.user.id,
      chatId,
      modelName,
      tokensUsed: tokenInfo.totalTokens,
      promptTokens: tokenInfo.promptTokens,
      completionTokens: tokenInfo.completionTokens,
      creditsDeducted,
      messageIds: [userMessageEntry.history_id, messageAI.history_id]
    });

    // Handle chat summary if needed
    if (SummaryManager.needsSummary(previousMessages.length)) {
      const summaryConfig: SummaryConfig = {
        llm,
        previousMessages,
        currentUserMessage: userMessage,
        currentAiResponse: response.text
      };
      
      const newSummary = await SummaryManager.generateSummary(summaryConfig);
      if (newSummary) {
        await ChatService.updateChatSummary(chatId, newSummary);
      }
    } else {
      await ChatService.updateTimestamp(chatId);
    }

    return res.status(200).json({
      success: true,
      userMessage: userMessageEntry,
      aiMessage: messageAI,
      model: modelName,
      tokensUsed: tokenInfo.totalTokens,
      creditsDeducted,
      credits_remaining: updatedUser.credits_remaining
    });

  } catch (error: unknown) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(ErrorHandler.handle(error));
    }
    const defaultError = new AppError(
      (error as Error).message || 'Internal server error',
      500,
      'INTERNAL_ERROR'
    );
    return res.status(500).json(ErrorHandler.handle(defaultError));
  }
}
