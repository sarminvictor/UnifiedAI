import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
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
import { ModelName, ChatMessage, AIProvider } from '@/types/ai.types';
import { SYSTEM_PROMPTS, TOKEN_RATES, MODEL_PROVIDER_MAP } from '@/utils/ai.constants';
import { logger } from '@/utils/logger';
import { serverLogger } from '@/utils/serverLogger';
import { ServerModelFactory } from '@/services/ai/serverModelFactory';
import { ServerError, ServerErrorCodes, handleServerError } from '@/utils/serverErrorHandler';
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { TokenCalculator } from '@/services/ai/tokenCalculator';
import { BrainstormSettings } from '@/types/chat/settings';
import { BRAINSTORM_PROMPTS } from '@/utils/prompts';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

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

async function handleRegularChat(
  chatId: string,
  userMessage: string,
  model: ModelName,
  provider: AIProvider,
  user: any,
  chat: any,
  currentCredits: Decimal
) {
  // Create model instance with the correct provider
  const llm = await AIModelFactory.createModel(provider, model);

  // Don't create user message here, it's already created by saveMessage
  const previousMessages = await ChatService.getPreviousMessages(chatId);

  const systemPrompt = SYSTEM_PROMPTS[model as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS[ModelName.ChatGPT];
  const messages = [
    new SystemMessage(
      `${systemPrompt}
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

  serverLogger.info('Attempting AI call with:', {
    messageLength: userMessage.length,
    historyLength: chat.chat_history.length,
    modelName: model
  });

  // Get AI response
  const response = await chain.call({ input: userMessage });

  // Log the full response for debugging
  serverLogger.debug('AI Response details:', {
    responseKeys: Object.keys(response),
    model: model,
    response: response
  });

  if (!response.text) {
    throw new ServerError(
      ServerErrorCodes.AI_PROCESSING_ERROR,
      'Empty response from AI'
    );
  }

  // Use the validated model name we already have
  serverLogger.info('Model used for response:', { model });

  // Calculate tokens and credits using TokenCalculator
  const tokenInfo = TokenCalculator.calculateMessageTokens(userMessage, response.text);
  const creditsDeducted = TokenCalculator.calculateCredits(
    model,
    parseInt(tokenInfo.promptTokens),
    parseInt(tokenInfo.completionTokens)
  );
  const newCredits = currentCredits.minus(new Decimal(creditsDeducted)).toString();

  // Get the last user message that was already saved
  let lastUserMessage = await prisma.chatHistory.findFirst({
    where: {
      chat_id: chatId,
      user_input: userMessage,
    },
    orderBy: {
      timestamp: 'desc'
    }
  });

  // If user message not found, create it
  if (!lastUserMessage) {
    serverLogger.warn('User message not found, creating it now:', {
      chatId,
      messageLength: userMessage.length
    });

    // Create the user message
    lastUserMessage = await prisma.chatHistory.create({
      data: {
        chat_id: chatId,
        user_input: userMessage,
        api_response: '',
        input_type: 'text',
        output_type: 'text',
        timestamp: new Date(),
        context_id: chatId,
        model: model,
        credits_deducted: '0'
      }
    });

    serverLogger.info('Created user message:', {
      messageId: lastUserMessage.history_id,
      chatId
    });
  }

  // Create AI message and update user credits
  const [messageAI, updatedUser] = await Promise.all([
    ChatService.createAIMessage(chatId, response.text, model, creditsDeducted),
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
      modelName: model,
      tokensUsed: tokenInfo.totalTokens,
      promptTokens: tokenInfo.promptTokens,
      completionTokens: tokenInfo.completionTokens,
      creditsDeducted,
      messageIds: [lastUserMessage.history_id, messageAI.history_id]
    });
  } catch (apiLogError) {
    serverLogger.error('Failed to log API usage:', {
      error: apiLogError instanceof Error ? apiLogError.message : 'Unknown error',
      modelName: model,
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

  return {
    userMessage: lastUserMessage,
    aiMessage: messageAI,
    model: {
      requested: model,
      actual: model
    },
    tokensUsed: tokenInfo.totalTokens,
    creditsDeducted,
    credits_remaining: updatedUser.credits_remaining
  };
}

async function handleBrainstormChat(
  chatId: string,
  userMessage: string,
  mainModel: ModelName,
  additionalModel: ModelName,
  summaryModel: ModelName,
  brainstormSettings: BrainstormSettings,
  user: any,
  chat: any,
  currentCredits: Decimal
) {
  serverLogger.info('Starting brainstorm session with settings:', {
    mainModel,
    additionalModel,
    summaryModel,
    messagesLimit: brainstormSettings.messagesLimit,
    customPromptLength: brainstormSettings.customPrompt?.length
  });

  // Update the user message to mark it as part of brainstorm
  await prisma.chatHistory.updateMany({
    where: {
      chat_id: chatId,
      user_input: userMessage,
    },
    data: {
      input_type: 'text',
      output_type: 'brainstorm'
    }
  });

  // Get the main and additional model providers
  const mainProvider = MODEL_PROVIDER_MAP[mainModel];
  const additionalProvider = MODEL_PROVIDER_MAP[additionalModel];
  const summaryProvider = MODEL_PROVIDER_MAP[summaryModel];

  if (!mainProvider || !additionalProvider || !summaryProvider) {
    throw new ServerError(
      ServerErrorCodes.VALIDATION_ERROR,
      'Invalid model configuration for brainstorm'
    );
  }

  // Create model instances
  const mainLLM = await AIModelFactory.createModel(mainProvider, mainModel);
  const additionalLLM = await AIModelFactory.createModel(additionalProvider, additionalModel);
  const summaryLLM = await AIModelFactory.createModel(summaryProvider, summaryModel);

  // Get previous messages
  const previousMessages = await ChatService.getPreviousMessages(chatId);

  // Create initial messages array with custom prompt as system message
  const initialMessages = [
    new SystemMessage(brainstormSettings.customPrompt),
    ...previousMessages.map(msg =>
      msg.user_input
        ? new HumanMessage(msg.user_input)
        : new AIMessage(msg.api_response || "")
    ),
    new HumanMessage(userMessage)
  ];

  // Track all responses for summary generation
  const brainstormResponses = [];
  let lastResponse = userMessage;
  let totalCreditsDeducted = new Decimal(0);
  const messageIds = [];

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
    // More detailed error for debugging
    serverLogger.error('User message not found in database', {
      chatId,
      userMessage: userMessage?.substring(0, 50) + (userMessage?.length > 50 ? '...' : ''),
      userMessageLength: userMessage?.length
    });

    // Try to save the message if it doesn't exist
    try {
      serverLogger.info('Attempting to save missing user message');
      const savedMessage = await prisma.chatHistory.create({
        data: {
          chat_id: chatId,
          user_input: userMessage,
          api_response: '',
          input_type: 'text',
          output_type: 'brainstorm',
          timestamp: new Date(),
          context_id: '',
          model: mainModel,
          credits_deducted: '0', // Convert to string for DB
        }
      });

      messageIds.push(savedMessage.history_id);
      serverLogger.info('Successfully saved missing user message', {
        messageId: savedMessage.history_id
      });
    } catch (saveError) {
      serverLogger.error('Failed to save missing user message', {
        error: saveError instanceof Error ? saveError.message : 'Unknown error',
        stack: saveError instanceof Error ? saveError.stack : undefined
      });
      throw new Error('User message not found and could not be saved');
    }
  } else {
    messageIds.push(lastUserMessage.history_id);
  }

  // Generate brainstorm responses
  for (let i = 0; i < brainstormSettings.messagesLimit; i++) {
    try {
      // Determine which model to use for this iteration
      const currentModel = i % 2 === 0 ? mainModel : additionalModel;
      const currentLLM = i % 2 === 0 ? mainLLM : additionalLLM;

      // Log status update instead of streaming
      serverLogger.info(`Starting brainstorm generation #${i + 1}`, {
        model: currentModel,
        current: i + 1,
        total: brainstormSettings.messagesLimit
      });

      // Log the input for debugging
      serverLogger.info(`Preparing brainstorm input for response #${i + 1}:`, {
        model: currentModel,
        promptLength: brainstormSettings.customPrompt?.length || 0,
        lastResponseLength: lastResponse?.length || 0,
        lastResponsePreview: lastResponse?.substring(0, 50) + (lastResponse?.length > 50 ? '...' : '') || 'empty'
      });

      // Create a chain with the current model
      const messages = [
        new SystemMessage(brainstormSettings.customPrompt || BRAINSTORM_PROMPTS.DEFAULT_BRAINSTORM),
        new HumanMessage(lastResponse || userMessage)
      ];

      serverLogger.info(`Generating brainstorm response #${i + 1} with model:`, {
        model: currentModel,
        inputLength: lastResponse?.length || 0
      });

      // Get AI response
      const chain = new LLMChain({
        llm: currentLLM,
        prompt: ChatPromptTemplate.fromMessages(messages),
        verbose: false
      });

      // Wrap the LLM call in a try-catch for better error handling
      let response;
      try {
        // Log immediately before the call
        serverLogger.info(`Executing LLM chain for brainstorm #${i + 1}`, {
          model: currentModel,
          provider: i % 2 === 0 ? mainProvider : additionalProvider
        });

        response = await chain.call({ input: lastResponse });

        // Log immediately after successful call
        serverLogger.info(`Successfully generated response for brainstorm #${i + 1}`, {
          model: currentModel,
          responseLength: response?.text?.length || 0
        });
      } catch (llmError) {
        serverLogger.error(`LLM error in brainstorm iteration ${i + 1}`, {
          error: llmError instanceof Error ? llmError.message : 'Unknown error',
          stack: llmError instanceof Error ? llmError.stack : undefined,
          model: currentModel,
          provider: i % 2 === 0 ? mainProvider : additionalProvider
        });

        // Try fallback text
        response = { text: `Sorry, I encountered an error while generating this brainstorm response. Let's continue with the next response.` };
      }

      if (!response.text) {
        throw new ServerError(
          ServerErrorCodes.AI_PROCESSING_ERROR,
          `Empty response from AI in brainstorm iteration ${i + 1}`
        );
      }

      // Calculate tokens and credits
      const tokenInfo = TokenCalculator.calculateMessageTokens(lastResponse, response.text);
      const creditsDeducted = TokenCalculator.calculateCredits(
        currentModel,
        parseInt(tokenInfo.promptTokens),
        parseInt(tokenInfo.completionTokens)
      );

      // Add to total credits deducted
      totalCreditsDeducted = totalCreditsDeducted.plus(new Decimal(creditsDeducted));

      // Save the brainstorm message to the database
      const brainstormMessage = await prisma.chatHistory.create({
        data: {
          chat_id: chatId,
          user_input: lastResponse,
          api_response: response.text,
          input_type: 'brainstorm',
          output_type: 'brainstorm',
          timestamp: new Date(),
          context_id: '',
          model: currentModel,
          credits_deducted: creditsDeducted,
        }
      });

      messageIds.push(brainstormMessage.history_id);

      // Log API usage
      await APIUsageService.logAPIUsage({
        userId: user.id,
        chatId,
        modelName: currentModel,
        tokensUsed: tokenInfo.totalTokens,
        promptTokens: tokenInfo.promptTokens,
        completionTokens: tokenInfo.completionTokens,
        creditsDeducted,
        messageIds: [brainstormMessage.history_id]
      });

      // Store the response for the next iteration and summary
      brainstormResponses.push(response.text);
      lastResponse = response.text;
    } catch (iterationError) {
      // Handle errors in individual iterations separately so one failure doesn't stop the whole process
      serverLogger.error(`Error in brainstorm iteration ${i + 1}`, {
        error: iterationError instanceof Error ? iterationError.message : 'Unknown error',
        stack: iterationError instanceof Error ? iterationError.stack : undefined
      });

      // Try to recover and continue with next iteration
      try {
        // Log error instead of streaming it
        serverLogger.error(`Error in generation ${i + 1}: ${iterationError instanceof Error ? iterationError.message : 'Unknown error'}`, {
          iteration: i
        });

        // Save a placeholder message to maintain the flow
        await prisma.chatHistory.create({
          data: {
            chat_id: chatId,
            user_input: lastResponse,
            api_response: `[Error during brainstorm generation #${i + 1}]`,
            input_type: 'brainstorm',
            output_type: 'brainstorm',
            timestamp: new Date(),
            context_id: '',
            model: i % 2 === 0 ? mainModel : additionalModel,
            credits_deducted: '0', // Convert to string for DB
          }
        });

        // Continue to next iteration
        continue;
      } catch (recoveryError) {
        serverLogger.error('Failed to recover from iteration error', {
          error: recoveryError instanceof Error ? recoveryError.message : 'Unknown error',
        });
      }
    }
  }

  // Generate summary after all brainstorm messages
  serverLogger.info('Generating brainstorm summary with model:', {
    model: summaryModel,
    responsesCount: brainstormResponses.length
  });

  // Create summary prompt with all brainstorm responses
  const summaryMessages = [
    new SystemMessage(BRAINSTORM_PROMPTS.SUMMARY),
    new HumanMessage(`Summarize the following brainstorming session that started with this user message: "${userMessage}"\n\nBrainstorming responses:\n${brainstormResponses.join('\n\n')}`)
  ];

  const summaryChain = new LLMChain({
    llm: summaryLLM,
    prompt: ChatPromptTemplate.fromMessages(summaryMessages),
    verbose: false
  });

  // Get summary response
  const summaryResponse = await summaryChain.call({ input: brainstormResponses.join('\n\n') });

  if (!summaryResponse.text) {
    throw new ServerError(
      ServerErrorCodes.AI_PROCESSING_ERROR,
      'Empty summary response from AI'
    );
  }

  // Calculate tokens and credits for summary
  const summaryTokenInfo = TokenCalculator.calculateMessageTokens(
    brainstormResponses.join('\n\n'),
    summaryResponse.text
  );

  const summaryCreditsDeducted = TokenCalculator.calculateCredits(
    summaryModel,
    parseInt(summaryTokenInfo.promptTokens),
    parseInt(summaryTokenInfo.completionTokens)
  );

  // Add to total credits deducted
  totalCreditsDeducted = totalCreditsDeducted.plus(new Decimal(summaryCreditsDeducted));

  // Save the summary message to the database
  const summaryMessage = await prisma.chatHistory.create({
    data: {
      chat_id: chatId,
      user_input: '',
      api_response: summaryResponse.text,
      input_type: 'brainstorm',
      output_type: 'summary',
      timestamp: new Date(),
      context_id: '',
      model: summaryModel,
      credits_deducted: summaryCreditsDeducted,
    }
  });

  messageIds.push(summaryMessage.history_id);

  // Log API usage for summary
  await APIUsageService.logAPIUsage({
    userId: user.id,
    chatId,
    modelName: summaryModel,
    tokensUsed: summaryTokenInfo.totalTokens,
    promptTokens: summaryTokenInfo.promptTokens,
    completionTokens: summaryTokenInfo.completionTokens,
    creditsDeducted: summaryCreditsDeducted,
    messageIds: [summaryMessage.history_id]
  });

  // Update chat timestamp
  await ChatService.updateTimestamp(chatId);

  // Update user credits
  const newCredits = currentCredits.minus(totalCreditsDeducted).toString();
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { credits_remaining: newCredits }
  });

  return {
    userMessage: lastUserMessage,
    aiMessage: summaryMessage,
    brainstormMessages: messageIds,
    model: {
      main: mainModel,
      additional: additionalModel,
      summary: summaryModel
    },
    creditsDeducted: totalCreditsDeducted.toString(),
    credits_remaining: updatedUser.credits_remaining,
    isBrainstorm: true
  };
}

// Add streaming support for brainstorm mode
async function handleBrainstormChatWithStreaming(
  chatId: string,
  userMessage: string,
  mainModel: ModelName,
  additionalModel: ModelName,
  summaryModel: ModelName,
  brainstormSettings: BrainstormSettings,
  user: any,
  chat: any,
  currentCredits: Decimal,
  shouldStream: boolean = false
) {
  // Add a sequence counter for events
  let eventSequence = 0;

  // Function to get the next sequence number
  const getNextSequence = () => eventSequence++;

  // Create a TransformStream for streaming responses
  const encoder = new TextEncoder();

  if (!shouldStream) {
    // If streaming is not requested, use the regular function
    return handleBrainstormChat(
      chatId,
      userMessage,
      mainModel,
      additionalModel,
      summaryModel,
      brainstormSettings,
      user,
      chat,
      currentCredits
    );
  }

  // Create a stream for the response
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();

  // Process in the background and stream results
  (async () => {
    try {
      serverLogger.info('Starting brainstorm session with streaming:', {
        mainModel,
        additionalModel,
        summaryModel,
        messagesLimit: brainstormSettings.messagesLimit
      });

      // Update the user message to mark it as part of brainstorm
      await prisma.chatHistory.updateMany({
        where: {
          chat_id: chatId,
          user_input: userMessage,
        },
        data: {
          input_type: 'text',
          output_type: 'brainstorm'
        }
      });

      // Send initial status
      const initialStatus = {
        event: 'status',
        data: {
          status: 'started',
          message: 'Starting brainstorm session...'
        }
      };
      await writer.write(encoder.encode(JSON.stringify(initialStatus) + '\n'));

      // Get the main and additional model providers
      const mainProvider = MODEL_PROVIDER_MAP[mainModel];
      const additionalProvider = MODEL_PROVIDER_MAP[additionalModel];
      const summaryProvider = MODEL_PROVIDER_MAP[summaryModel];

      if (!mainProvider || !additionalProvider || !summaryProvider) {
        throw new ServerError(
          ServerErrorCodes.VALIDATION_ERROR,
          'Invalid model configuration for brainstorm'
        );
      }

      // Create model instances
      const mainLLM = await AIModelFactory.createModel(mainProvider, mainModel);
      const additionalLLM = await AIModelFactory.createModel(additionalProvider, additionalModel);
      const summaryLLM = await AIModelFactory.createModel(summaryProvider, summaryModel);

      // Track all responses for summary generation
      const brainstormResponses = [];
      let lastResponse = userMessage;
      let totalCreditsDeducted = new Decimal(0);
      const messageIds = [];

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
        // More detailed error for debugging
        serverLogger.error('User message not found in database for streaming brainstorm', {
          chatId,
          userMessage: userMessage?.substring(0, 50) + (userMessage?.length > 50 ? '...' : ''),
          userMessageLength: userMessage?.length
        });

        // Send error status to client
        const errorStatus = {
          event: 'status',
          data: {
            status: 'error',
            message: 'User message not found in database'
          }
        };
        await writer.write(encoder.encode(JSON.stringify(errorStatus) + '\n'));

        // Try to save the message if it doesn't exist
        try {
          serverLogger.info('Attempting to save missing user message for streaming brainstorm');
          const savedMessage = await prisma.chatHistory.create({
            data: {
              chat_id: chatId,
              user_input: userMessage,
              api_response: '',
              input_type: 'text',
              output_type: 'brainstorm',
              timestamp: new Date(),
              context_id: '',
              model: mainModel,
              credits_deducted: '0', // Convert to string for DB
            }
          });

          messageIds.push(savedMessage.history_id);
          serverLogger.info('Successfully saved missing user message', {
            messageId: savedMessage.history_id
          });

          // Update status
          const successStatus = {
            event: 'status',
            data: {
              status: 'recovered',
              message: 'Recovered from error, continuing brainstorm'
            }
          };
          await writer.write(encoder.encode(JSON.stringify(successStatus) + '\n'));
        } catch (saveError) {
          serverLogger.error('Failed to save missing user message', {
            error: saveError instanceof Error ? saveError.message : 'Unknown error',
            stack: saveError instanceof Error ? saveError.stack : undefined
          });

          // Send terminal error status
          const fatalStatus = {
            event: 'status',
            data: {
              status: 'fatal',
              message: 'User message not found and could not be saved'
            }
          };
          await writer.write(encoder.encode(JSON.stringify(fatalStatus) + '\n'));

          // Close the writer
          await writer.close();

          throw new Error('User message not found and could not be saved');
        }
      } else {
        messageIds.push(lastUserMessage.history_id);
      }

      // Generate brainstorm responses
      for (let i = 0; i < brainstormSettings.messagesLimit; i++) {
        try {
          // Determine which model to use for this iteration
          const currentModel = i % 2 === 0 ? mainModel : additionalModel;
          const currentLLM = i % 2 === 0 ? mainLLM : additionalLLM;

          // Send status update
          const statusUpdate = {
            event: 'status',
            data: {
              status: 'generating',
              message: `Generating response #${i + 1} with ${currentModel}...`,
              current: i + 1,
              total: brainstormSettings.messagesLimit
            }
          };
          await writer.write(encoder.encode(JSON.stringify(statusUpdate) + '\n'));

          // Create a chain with the current model
          const messages = [
            new SystemMessage(brainstormSettings.customPrompt || BRAINSTORM_PROMPTS.DEFAULT_BRAINSTORM),
            new HumanMessage(lastResponse || userMessage)
          ];

          serverLogger.info(`Generating brainstorm response #${i + 1} with model:`, {
            model: currentModel,
            inputLength: lastResponse.length
          });

          // Create a message ID for this response
          const messageId = `brainstorm-${i + 1}-${Date.now()}`;

          // Start message event
          const startMessageEvent = {
            event: 'messageStart',
            data: {
              id: messageId,
              model: currentModel,
              index: i,
              sequence: getNextSequence()
            }
          };
          await writer.write(encoder.encode(JSON.stringify(startMessageEvent) + '\n'));

          // Get AI response
          const chain = new LLMChain({
            llm: currentLLM,
            prompt: ChatPromptTemplate.fromMessages(messages),
            verbose: false
          });

          // Simulate streaming by breaking the response into chunks
          let response;
          try {
            // Log immediately before the call
            serverLogger.info(`Executing LLM chain for brainstorm #${i + 1} with streaming`, {
              model: currentModel,
              provider: i % 2 === 0 ? mainProvider : additionalProvider
            });

            response = await chain.call({ input: lastResponse });

            // Log immediately after successful call
            serverLogger.info(`Successfully generated response for brainstorm #${i + 1}`, {
              model: currentModel,
              responseLength: response?.text?.length || 0
            });
          } catch (llmError) {
            serverLogger.error(`LLM error in brainstorm iteration ${i + 1}`, {
              error: llmError instanceof Error ? llmError.message : 'Unknown error',
              stack: llmError instanceof Error ? llmError.stack : undefined,
              model: currentModel,
              provider: i % 2 === 0 ? mainProvider : additionalProvider
            });

            // Send error event
            const errorEvent = {
              event: 'error',
              data: {
                message: `Error in model ${currentModel}: ${llmError instanceof Error ? llmError.message : 'Unknown error'}`,
                iteration: i
              }
            };
            await writer.write(encoder.encode(JSON.stringify(errorEvent) + '\n'));

            // Try fallback text
            response = { text: `Sorry, I encountered an error while generating this brainstorm response. Let's continue with the next response.` };
          }

          if (!response.text) {
            throw new ServerError(
              ServerErrorCodes.AI_PROCESSING_ERROR,
              `Empty response from AI in brainstorm iteration ${i + 1}`
            );
          }

          // Stream the response text character by character
          const text = response.text;
          for (let j = 0; j < text.length; j++) {
            const chunk = text[j];

            // Send token update
            const tokenUpdate = {
              event: 'token',
              data: {
                id: messageId,
                token: chunk,
                sequence: getNextSequence()
              }
            };
            await writer.write(encoder.encode(JSON.stringify(tokenUpdate) + '\n'));

            // Add a small delay to simulate typing
            // Send every character with a small delay to create a smoother typing effect
            // We don't need to delay every 5 characters, but every character for a more natural effect
            await new Promise(resolve => setTimeout(resolve, 15));
          }

          // Calculate tokens and credits
          const tokenInfo = TokenCalculator.calculateMessageTokens(lastResponse, text);
          const creditsDeducted = TokenCalculator.calculateCredits(
            currentModel,
            parseInt(tokenInfo.promptTokens),
            parseInt(tokenInfo.completionTokens)
          );

          // Add to total credits deducted
          totalCreditsDeducted = totalCreditsDeducted.plus(new Decimal(creditsDeducted));

          // Save the brainstorm message to the database
          const brainstormMessage = await prisma.chatHistory.create({
            data: {
              chat_id: chatId,
              user_input: lastResponse,
              api_response: text,
              input_type: 'brainstorm',
              output_type: 'brainstorm',
              timestamp: new Date(),
              context_id: '',
              model: currentModel,
              credits_deducted: creditsDeducted,
            }
          });

          messageIds.push(brainstormMessage.history_id);

          // Log API usage
          await APIUsageService.logAPIUsage({
            userId: user.id,
            chatId,
            modelName: currentModel,
            tokensUsed: tokenInfo.totalTokens,
            promptTokens: tokenInfo.promptTokens,
            completionTokens: tokenInfo.completionTokens,
            creditsDeducted,
            messageIds: [brainstormMessage.history_id]
          });

          // Send message complete event
          const messageCompleteEvent = {
            event: 'messageComplete',
            data: {
              id: messageId,
              dbId: brainstormMessage.history_id,
              model: currentModel,
              text: text,
              index: i,
              creditsDeducted: creditsDeducted,
              sequence: getNextSequence()
            }
          };
          await writer.write(encoder.encode(JSON.stringify(messageCompleteEvent) + '\n'));

          // Store the response for the next iteration and summary
          brainstormResponses.push(text);
          lastResponse = text;
        } catch (iterationError) {
          // Handle errors in individual iterations separately so one failure doesn't stop the whole process
          serverLogger.error(`Error in brainstorm iteration ${i + 1}`, {
            error: iterationError instanceof Error ? iterationError.message : 'Unknown error',
            stack: iterationError instanceof Error ? iterationError.stack : undefined
          });

          // Try to recover and continue with next iteration
          try {
            // Log error instead of streaming it
            serverLogger.error(`Error in generation ${i + 1}: ${iterationError instanceof Error ? iterationError.message : 'Unknown error'}`, {
              iteration: i
            });

            // Save a placeholder message to maintain the flow
            await prisma.chatHistory.create({
              data: {
                chat_id: chatId,
                user_input: lastResponse,
                api_response: `[Error during brainstorm generation #${i + 1}]`,
                input_type: 'brainstorm',
                output_type: 'brainstorm',
                timestamp: new Date(),
                context_id: '',
                model: i % 2 === 0 ? mainModel : additionalModel,
                credits_deducted: '0', // Convert to string for DB
              }
            });

            // Continue to next iteration
            continue;
          } catch (recoveryError) {
            serverLogger.error('Failed to recover from iteration error', {
              error: recoveryError instanceof Error ? recoveryError.message : 'Unknown error',
            });
          }
        }
      }

      // Send status update for summary generation
      const summaryStatusUpdate = {
        event: 'status',
        data: {
          status: 'summarizing',
          message: `Generating summary with ${summaryModel}...`
        }
      };
      await writer.write(encoder.encode(JSON.stringify(summaryStatusUpdate) + '\n'));

      // Generate summary after all brainstorm messages
      serverLogger.info('Generating brainstorm summary with model:', {
        model: summaryModel,
        responsesCount: brainstormResponses.length
      });

      // Create summary prompt with all brainstorm responses
      const summaryMessages = [
        new SystemMessage(BRAINSTORM_PROMPTS.SUMMARY),
        new HumanMessage(`Summarize the following brainstorming session that started with this user message: "${userMessage}"\n\nBrainstorming responses:\n${brainstormResponses.join('\n\n')}`)
      ];

      // Create a message ID for the summary
      const summaryId = `summary-${Date.now()}`;

      // Start summary event
      const startSummaryEvent = {
        event: 'summaryStart',
        data: {
          id: summaryId,
          model: summaryModel
        }
      };
      await writer.write(encoder.encode(JSON.stringify(startSummaryEvent) + '\n'));

      // Get summary response
      const summaryChain = new LLMChain({
        llm: summaryLLM,
        prompt: ChatPromptTemplate.fromMessages(summaryMessages),
        verbose: false
      });

      const summaryResponse = await summaryChain.call({ input: brainstormResponses.join('\n\n') });

      if (!summaryResponse.text) {
        throw new ServerError(
          ServerErrorCodes.AI_PROCESSING_ERROR,
          'Empty summary response from AI'
        );
      }

      // Stream the summary text character by character
      const summaryText = summaryResponse.text;
      for (let j = 0; j < summaryText.length; j++) {
        const chunk = summaryText[j];

        // Send token update
        const tokenUpdate = {
          event: 'token',
          data: {
            id: summaryId,
            token: chunk,
            sequence: getNextSequence()
          }
        };
        await writer.write(encoder.encode(JSON.stringify(tokenUpdate) + '\n'));

        // Add a small delay to simulate typing
        await new Promise(resolve => setTimeout(resolve, 15));
      }

      // Calculate tokens and credits for summary
      const summaryTokenInfo = TokenCalculator.calculateMessageTokens(
        brainstormResponses.join('\n\n'),
        summaryText
      );

      const summaryCreditsDeducted = TokenCalculator.calculateCredits(
        summaryModel,
        parseInt(summaryTokenInfo.promptTokens),
        parseInt(summaryTokenInfo.completionTokens)
      );

      // Add to total credits deducted
      totalCreditsDeducted = totalCreditsDeducted.plus(new Decimal(summaryCreditsDeducted));

      // Save the summary message to the database
      const summaryMessage = await prisma.chatHistory.create({
        data: {
          chat_id: chatId,
          user_input: '',
          api_response: summaryText,
          input_type: 'brainstorm',
          output_type: 'summary',
          timestamp: new Date(),
          context_id: '',
          model: summaryModel,
          credits_deducted: summaryCreditsDeducted,
        }
      });

      messageIds.push(summaryMessage.history_id);

      // Log API usage for summary
      await APIUsageService.logAPIUsage({
        userId: user.id,
        chatId,
        modelName: summaryModel,
        tokensUsed: summaryTokenInfo.totalTokens,
        promptTokens: summaryTokenInfo.promptTokens,
        completionTokens: summaryTokenInfo.completionTokens,
        creditsDeducted: summaryCreditsDeducted,
        messageIds: [summaryMessage.history_id]
      });

      // Send summary complete event
      const summaryCompleteEvent = {
        event: 'summaryComplete',
        data: {
          id: summaryId,
          dbId: summaryMessage.history_id,
          model: summaryModel,
          text: summaryText,
          creditsDeducted: summaryCreditsDeducted,
          sequence: getNextSequence()
        }
      };
      await writer.write(encoder.encode(JSON.stringify(summaryCompleteEvent) + '\n'));

      // Update chat timestamp
      await ChatService.updateTimestamp(chatId);

      // Update user credits
      const newCredits = currentCredits.minus(totalCreditsDeducted).toString();
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { credits_remaining: newCredits }
      });

      // Send completion status
      const completionStatus = {
        event: 'status',
        data: {
          status: 'completed',
          message: 'Brainstorm session completed',
          userMessage: lastUserMessage,
          aiMessage: summaryMessage,
          brainstormMessages: messageIds,
          model: {
            main: mainModel,
            additional: additionalModel,
            summary: summaryModel
          },
          creditsDeducted: totalCreditsDeducted.toString(),
          credits_remaining: updatedUser.credits_remaining,
          isBrainstorm: true
        }
      };
      await writer.write(encoder.encode(JSON.stringify(completionStatus) + '\n'));

    } catch (error) {
      serverLogger.error('Streaming brainstorm error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Send error status
      const errorStatus = {
        event: 'error',
        data: {
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
      await writer.write(encoder.encode(JSON.stringify(errorStatus) + '\n'));
    } finally {
      writer.close();
    }
  })();

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

/**
 * Handle a regular chat with streaming response
 */
async function handleRegularChatWithStreaming(
  chatId: string,
  userMessage: string,
  model: ModelName,
  provider: AIProvider,
  user: any,
  chat: any,
  currentCredits: Decimal
) {
  // Add a sequence counter for events
  let eventSequence = 0;

  // Function to get the next sequence number
  const getNextSequence = () => eventSequence++;

  // Create a TransformStream for streaming responses
  const encoder = new TextEncoder();

  // Create a stream for the response
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();

  // Process in the background and stream results
  (async () => {
    try {
      serverLogger.info('Starting regular chat with streaming:', {
        model,
        chatId,
        messageLength: userMessage.length
      });

      // Create model instance with the correct provider
      const llm = await AIModelFactory.createModel(provider, model);

      // Don't create user message here, it's already created by saveMessage
      const previousMessages = await ChatService.getPreviousMessages(chatId);

      const systemPrompt = SYSTEM_PROMPTS[model as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS[ModelName.ChatGPT];
      const messages = [
        new SystemMessage(
          `${systemPrompt}
          ${chat.chat_summary ? `\nContext from previous conversation: ${chat.chat_summary}` : ''}`
        ),
        ...previousMessages.map(msg =>
          msg.user_input
            ? new HumanMessage(msg.user_input)
            : new AIMessage(msg.api_response || "")
        ),
        new HumanMessage(userMessage)
      ];

      // Generate a unique message ID
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Send message start event
      const startEvent = {
        event: 'messageStart',
        data: {
          id: messageId,
          model: model
        }
      };

      serverLogger.debug('Sending messageStart event:', {
        messageId,
        model
      });

      await writer.write(encoder.encode(JSON.stringify(startEvent) + '\n'));

      // Function to send a token event
      const sendTokenEvent = async (token: string) => {
        const tokenUpdate = {
          event: 'token',
          data: {
            id: messageId,
            token: token,
            sequence: getNextSequence()
          }
        };

        await writer.write(encoder.encode(JSON.stringify(tokenUpdate) + '\n'));
      };

      // Function to split a large text into smaller chunks for streaming
      const streamTextInChunks = async (text: string) => {
        // If the text is very short, just send it as is
        if (text.length <= 15) {
          await sendTokenEvent(text);
          await new Promise(resolve => setTimeout(resolve, 10));
          return;
        }

        // Split the text into sentences or smaller chunks
        // This regex splits on sentence boundaries (periods, question marks, exclamation points)
        // followed by a space or end of string
        const chunks = text.match(/[^.!?]+[.!?](?:\s|$)|[^.!?]+$/g) || [];

        for (const chunk of chunks) {
          // For longer sentences, split them into smaller pieces (words or small groups of words)
          if (chunk.length > 30) {
            // Split the chunk into words
            const words = chunk.split(/\s+/);
            let currentGroup = '';

            for (const word of words) {
              currentGroup += (currentGroup ? ' ' : '') + word;

              // Send the current group when it reaches a reasonable size
              if (currentGroup.length >= 15 || word === words[words.length - 1]) {
                await sendTokenEvent(currentGroup + (word === words[words.length - 1] && !chunk.endsWith(' ') ? ' ' : ''));
                currentGroup = '';

                // Add a small delay between tokens for a more natural typing effect
                await new Promise(resolve => setTimeout(resolve, 15));
              }
            }
          } else {
            // For shorter chunks, send them as is
            await sendTokenEvent(chunk);
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        }
      };

      // Set up streaming with LangChain
      let fullText = '';

      // Configure the model for streaming
      if (provider === 'openai') {
        // For OpenAI, we need to set streaming: true
        (llm as any).streaming = true;
      } else if (provider === 'anthropic') {
        // For Anthropic, ensure streaming is enabled
        (llm as any).streaming = true;
      }

      // Create a streaming chain with custom callbacks
      const chain = new LLMChain({
        llm: llm,
        prompt: ChatPromptTemplate.fromMessages(messages),
        verbose: false
      });

      try {
        // Stream the response
        const stream = await chain.stream({
          input: userMessage
        });

        // Process the stream
        for await (const chunk of stream) {
          // Different LLM providers return chunks in different formats
          let token = '';

          if (typeof chunk === 'string') {
            // Some providers return the token directly as a string
            token = chunk;
          } else if (chunk && typeof chunk === 'object') {
            // Others return an object with the token in different properties
            if ('token' in chunk) {
              token = chunk.token as string;
            } else if ('text' in chunk) {
              token = chunk.text as string;
            } else if ('content' in chunk) {
              token = chunk.content as string;
            } else if ('delta' in chunk && typeof chunk.delta === 'object' && 'content' in chunk.delta) {
              token = chunk.delta.content as string;
            }
          }

          // Only process non-empty tokens
          if (token && typeof token === 'string') {
            fullText += token;

            // Instead of sending the token directly, accumulate tokens and send them in chunks
            // This ensures we don't send the entire response as a single token
            if (token.length > 30) {
              // For longer tokens, use streamTextInChunks to break them down
              await streamTextInChunks(token);
            } else {
              // For shorter tokens, send them directly
              await sendTokenEvent(token);
              // Add a small delay for a more natural typing effect
              await new Promise(resolve => setTimeout(resolve, 10));
            }

            // Log every 10 tokens to avoid excessive logging
            if (getNextSequence() % 10 === 0) {
              serverLogger.debug('Streaming token:', {
                sequence: getNextSequence(),
                tokenLength: token.length,
                fullTextLength: fullText.length
              });
            }
          }
        }
      } catch (streamError) {
        serverLogger.error('Error streaming response:', {
          error: streamError instanceof Error ? streamError.message : 'Unknown error',
          stack: streamError instanceof Error ? streamError.stack : undefined
        });

        // If streaming fails, try to get a complete response
        const response = await chain.call({ input: userMessage });
        fullText = response.text || '';

        // Stream the complete text in chunks instead of sending it all at once
        if (fullText) {
          await streamTextInChunks(fullText);
        }
      }

      // Calculate tokens and credits
      const tokenInfo = TokenCalculator.calculateMessageTokens(userMessage, fullText);
      const creditsDeducted = TokenCalculator.calculateCredits(
        model,
        parseInt(tokenInfo.promptTokens),
        parseInt(tokenInfo.completionTokens)
      );
      const newCredits = currentCredits.minus(new Decimal(creditsDeducted)).toString();

      // Get the last user message that was already saved
      let lastUserMessage = await prisma.chatHistory.findFirst({
        where: {
          chat_id: chatId,
          user_input: userMessage,
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      // If user message not found, create it
      if (!lastUserMessage) {
        lastUserMessage = await prisma.chatHistory.create({
          data: {
            chat_id: chatId,
            user_input: userMessage,
            api_response: '',
            input_type: 'text',
            output_type: 'text',
            timestamp: new Date(),
            context_id: chatId,
            model: model,
            credits_deducted: '0'
          }
        });
      }

      // Create AI message and update user credits
      const [messageAI, updatedUser] = await Promise.all([
        ChatService.createAIMessage(chatId, fullText, model, creditsDeducted),
        prisma.user.update({
          where: { id: user.id },
          data: { credits_remaining: newCredits }
        })
      ]);

      // Log API usage
      try {
        await APIUsageService.logAPIUsage({
          userId: user.id,
          chatId,
          modelName: model,
          tokensUsed: tokenInfo.totalTokens,
          promptTokens: tokenInfo.promptTokens,
          completionTokens: tokenInfo.completionTokens,
          creditsDeducted,
          messageIds: [lastUserMessage.history_id, messageAI.history_id]
        });
      } catch (apiLogError) {
        serverLogger.error('Failed to log API usage:', {
          error: apiLogError instanceof Error ? apiLogError.message : 'Unknown error',
          modelName: model,
          chatId
        });
      }

      // Send message complete event
      const completeEvent = {
        event: 'messageComplete',
        data: {
          id: messageId,
          credits: creditsDeducted,
          model: model,
          text: fullText
        }
      };

      serverLogger.debug('Sending messageComplete event:', {
        messageId,
        creditsDeducted,
        textLength: fullText.length
      });

      await writer.write(encoder.encode(JSON.stringify(completeEvent) + '\n'));

      // Close the stream
      await writer.close();

    } catch (error) {
      serverLogger.error('Error in streaming regular chat:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Try to send an error event
      try {
        const errorEvent = {
          event: 'status',
          data: {
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        };
        await writer.write(encoder.encode(JSON.stringify(errorEvent) + '\n'));
        await writer.close();
      } catch (writeError) {
        // If we can't write to the stream, just log it
        serverLogger.error('Failed to write error to stream:', writeError);
      }
    }
  })();

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
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

    const { chatId, message: userMessage, modelName, stream = false } = payload;

    // Validate model name using type assertion
    if (!modelName || !Object.values(ModelName).includes(modelName)) {
      serverLogger.error('Invalid model name:', {
        modelName,
        validModels: Object.values(ModelName)
      });
      return NextResponse.json(
        { success: false, message: 'Invalid model name' },
        { status: 400 }
      );
    }

    // Now we can safely use the model name and get its provider
    const model = modelName as ModelName;
    const provider = MODEL_PROVIDER_MAP[model];

    if (!provider) {
      serverLogger.error('No provider found for model:', { model });
      return NextResponse.json(
        { success: false, message: 'Invalid model configuration' },
        { status: 400 }
      );
    }

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
      select: {
        chat_id: true,
        user_id: true,
        chat_title: true,
        chat_summary: true,
        brainstorm_mode: true,
        brainstorm_settings: true,
        chat_history: {
          orderBy: { timestamp: 'asc' },
          select: {
            history_id: true,
            user_input: true,
            api_response: true,
            timestamp: true,
            model: true,
            credits_deducted: true,
            input_type: true,
            output_type: true,
            context_id: true
          }
        }
      }
    });

    if (!chat) {
      return NextResponse.json(
        { success: false, message: 'Chat not found or access denied' },
        { status: 404 }
      );
    }

    // Check if this is a brainstorm chat
    if (chat.brainstorm_mode && chat.brainstorm_settings) {
      try {
        // Extract settings from the chat with proper type casting
        const brainstormSettings = JSON.parse(JSON.stringify(chat.brainstorm_settings)) as BrainstormSettings;
        const mainModel = (brainstormSettings.mainModel || model) as ModelName;
        const additionalModel = brainstormSettings.additionalModel as ModelName;
        const summaryModel = brainstormSettings.summaryModel as ModelName;

        // Handle brainstorm chat with streaming if requested
        if (stream) {
          return handleBrainstormChatWithStreaming(
            chatId,
            userMessage,
            mainModel,
            additionalModel,
            summaryModel,
            brainstormSettings,
            user,
            chat,
            currentCredits,
            true // Pass true for shouldStream
          );
        }

        // Handle brainstorm chat without streaming
        const result = await handleBrainstormChat(
          chatId,
          userMessage,
          mainModel,
          additionalModel,
          summaryModel,
          brainstormSettings,
          user,
          chat,
          currentCredits
        );

        return NextResponse.json({
          success: true,
          ...result
        });
      } catch (error) {
        serverLogger.error('Brainstorm processing error:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });

        // Try to fall back to regular chat if brainstorm fails
        try {
          serverLogger.info('Falling back to regular chat after brainstorm failure');
          const result = await handleRegularChat(
            chatId,
            userMessage,
            model,
            provider,
            user,
            chat,
            currentCredits
          );

          return NextResponse.json({
            success: true,
            ...result,
            fallback: true,
            fallbackReason: error instanceof Error ? error.message : 'Brainstorm processing failed'
          });
        } catch (fallbackError) {
          throw error; // Throw the original error if fallback also fails
        }
      }
    } else {
      // Handle regular chat
      if (stream) {
        // Use streaming for regular chat
        return handleRegularChatWithStreaming(
          chatId,
          userMessage,
          model,
          provider,
          user,
          chat,
          currentCredits
        );
      }

      // Non-streaming regular chat
      const result = await handleRegularChat(
        chatId,
        userMessage,
        model,
        provider,
        user,
        chat,
        currentCredits
      );

      return NextResponse.json({
        success: true,
        ...result
      });
    }
  } catch (error) {
    serverLogger.error('Chat processing error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return handleServerError(error);
  }
}
