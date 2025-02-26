import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prismaClient';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import { BufferMemory } from "langchain/memory";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { Decimal } from '@prisma/client/runtime/library';
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { AIModelFactory } from '@/services/ai/modelFactory';
import { SummaryManager } from '@/services/ai/summaryManager';
import { ChatService } from '@/services/db/chatService';
import { UserService } from '@/services/db/userService';
import { APIUsageService } from '@/services/db/apiUsageService';
import { ModelName, ChatMessage } from '@/types/ai.types';
import { SYSTEM_PROMPTS, TOKEN_RATES } from '@/utils/ai.constants';
import { logger } from '@/utils/logger';
import { serverLogger } from '@/utils/serverLogger';
import { ServerModelFactory } from '@/services/ai/serverModelFactory';
import { ServerError, ServerErrorCodes, handleServerError } from '@/utils/serverErrorHandler';
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { TokenCalculator } from '@/services/ai/tokenCalculator'; // Add this import

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

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    serverLogger.info('ChatWithGPT request:', payload);

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      serverLogger.error('Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, credits_remaining: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { chatId, message: userMessage, modelName } = payload;

    // Validate model name using type assertion
    if (!modelName || !Object.values(ModelName).includes(modelName as ModelName)) {
      serverLogger.error('Invalid model name:', {
        modelName,
        validModels: Object.values(ModelName)
      });
      return NextResponse.json(
        { success: false, message: 'Invalid model name' },
        { status: 400 }
      );
    }

    // Now we can safely use the model name
    const model = modelName as ModelName;

    // Validate input
    if (!chatId || !userMessage || !modelName) {
      logger.error('Missing required fields:', { chatId, modelName, hasMessage: !!userMessage });
      return NextResponse.json(
        { success: false, message: 'Missing required fields', details: { chatId, modelName, hasMessage: !!userMessage } },
        { status: 400 }
      );
    }

    // Check credits before processing
    const currentCredits = new Decimal(user.credits_remaining);
    const requiredCredits = new Decimal('0.1'); // Minimum required credits

    if (!currentCredits.greaterThanOrEqualTo(requiredCredits)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient credits' },
        { status: 403 }
      );
    }

    // Verify chat ownership and status
    const chat = await prisma.chat.findFirst({
      where: {
        chat_id: chatId,
        user_id: user.id,
        deleted: false  // Add check for deleted status
      },
      include: {
        chat_history: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    if (!chat) {
      return NextResponse.json(
        { success: false, message: 'Chat not found or access denied' },
        { status: 404 }
      );
    }

    // Initialize AI components with simplified chain creation
    const llm = await ServerModelFactory.createModel(modelName);

    // Don't create user message here, it's already created by saveMessage
    const previousMessages = await ChatService.getPreviousMessages(chatId);

    const messages = [
      new SystemMessage(
        `${SYSTEM_PROMPTS.DEFAULT_CHAT}
        ${chat.chat_summary ? `\nContext from previous conversation: ${chat.chat_summary}` : ''}`
      ),
      ...previousMessages.map(msg =>
        msg.user_input
          ? new HumanMessage(msg.user_input)
          : new AIMessage(msg.api_response || "")
      ),
      new HumanMessage(userMessage)
    ];

    const chain = createChain(llm, messages, previousMessages);

    try {
      serverLogger.info('Attempting AI call with:', {
        messageLength: userMessage.length,
        historyLength: chat.chat_history.length,
        modelName
      });

      // Get AI response
      const response = await chain.call({ input: userMessage });

      // Log the full response for debugging
      serverLogger.debug('AI Response details:', {
        responseKeys: Object.keys(response),
        llmDetails: llm.modelName || llm._llm.model_name || llm._modelName,
        response: response
      });

      if (!response.text) {
        throw new ServerError(
          ServerErrorCodes.AI_PROCESSING_ERROR,
          'Empty response from AI'
        );
      }

      // Get actual model used from the LLM instance
      const actualModelUsed = llm.modelName || llm._llm.model_name || llm._modelName || modelName;
      serverLogger.info('Model used for response:', { actualModelUsed });

      // Calculate tokens and credits using TokenCalculator
      const tokenInfo = TokenCalculator.calculateMessageTokens(userMessage, response.text);
      const creditsDeducted = TokenCalculator.calculateCredits(modelName, parseInt(tokenInfo.totalTokens));
      const newCredits = currentCredits.minus(new Decimal(creditsDeducted)).toString();

      // Get the last user message that was already saved
      const lastUserMessage = await prisma.chatHistory.findFirst({
        where: {
          chat_id: chatId,
          user_input: userMessage,
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      if (!lastUserMessage) {
        throw new Error('User message not found');
      }

      // Create AI message and update user credits
      const [messageAI, updatedUser] = await Promise.all([
        ChatService.createAIMessage(chatId, response.text, modelName, creditsDeducted),
        prisma.user.update({
          where: { id: user.id },
          data: { credits_remaining: newCredits }
        })
      ]);

      // Log API usage with proper error handling
      try {
        await APIUsageService.logAPIUsage({
          userId: user.id,
          chatId,
          modelName,
          tokensUsed: tokenInfo.totalTokens,
          promptTokens: tokenInfo.promptTokens,
          completionTokens: tokenInfo.completionTokens,
          creditsDeducted,
          messageIds: [lastUserMessage.history_id, messageAI.history_id]
        });
      } catch (apiLogError) {
        serverLogger.error('Failed to log API usage:', {
          error: apiLogError instanceof Error ? apiLogError.message : 'Unknown error',
          modelName,
          chatId
        });
        // Continue without throwing - don't fail the whole request just because logging failed
      }

      // Handle chat summary if needed
      if (SummaryManager.needsSummary(chat.chat_history.length)) {
        serverLogger.info('Attempting to generate summary:', {
          historyLength: chat.chat_history.length,
          hasUserMessage: !!userMessage,
          hasAiResponse: !!response.text
        });

        const summaryConfig: SummaryConfig = {
          llm,
          previousMessages: chat.chat_history,
          currentUserMessage: userMessage,
          currentAiResponse: response.text
        };

        try {
          const newSummary = await SummaryManager.generateSummary(summaryConfig);
          if (newSummary) {
            await ChatService.updateChatSummary(chatId, newSummary);
            serverLogger.info('Summary updated successfully');
          }
        } catch (error) {
          serverLogger.error('Summary generation failed:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          });
          // Continue without summary
        }
      } else {
        await ChatService.updateTimestamp(chatId);
      }

      // Include actual model used in the response
      return NextResponse.json({
        success: true,
        userMessage: lastUserMessage,
        aiMessage: messageAI,
        model: {
          requested: modelName,
          actual: actualModelUsed
        },
        tokensUsed: tokenInfo.totalTokens,
        creditsDeducted,
        credits_remaining: updatedUser.credits_remaining
      });

    } catch (error) {
      serverLogger.error('Chain call error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        modelName,
        messageLength: userMessage.length
      });

      return NextResponse.json(
        {
          success: false,
          message: 'AI processing failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    serverLogger.error('ChatGPT API Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: error instanceof ServerError ? error.code : undefined,
      details: error instanceof ServerError ? error.details : undefined
    });

    if (error instanceof ServerError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          code: error.code,
          details: error.details
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to process chat request',
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    );
  }
}
