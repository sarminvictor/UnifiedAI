import { ChatMessage } from '@/types/store';
import { logger } from '@/utils/logger';
import { chatService } from './chatService';
import { generateChatId } from '@/utils/chatUtils';
import { ModelName } from '@/types/ai.types';
import { DEFAULT_BRAINSTORM_SETTINGS } from '@/types/chat/settings';
import { toast } from 'sonner';
import { streamingService } from './streamingService';
import { useChatStore } from '@/store/chat/chatStore';

export const messageService = {
  /**
   * Send a message to the AI and handle streaming responses
   */
  async sendMessage(
    chatId: string,
    messageText: string,
    model: ModelName,
    brainstormMode = false,
    brainstormSettings = DEFAULT_BRAINSTORM_SETTINGS
  ) {
    try {
      // Get the store dispatch function
      const dispatch = useChatStore.getState().dispatch;

      const isTemp = chatId.startsWith('temp_');
      let actualChatId = chatId;
      let replacementInfo = null;

      // Create a new chat ID if this is a temporary ID
      if (isTemp) {
        // Generate a real UUID for the chat
        const realChatId = generateChatId();
        actualChatId = realChatId;
        replacementInfo = { oldId: chatId, newId: actualChatId };

        logger.debug('Replacing temporary chat ID:', {
          tempId: chatId,
          realId: actualChatId,
          model,
          timestamp: new Date().toISOString()
        });

        // Update the store directly
        dispatch({
          type: 'REPLACE_TEMP_CHAT',
          payload: {
            tempId: chatId,
            realId: actualChatId,
            updates: {
              brainstorm_mode: brainstormMode,
              brainstorm_settings: {
                ...brainstormSettings,
                mainModel: model
              }
            }
          }
        });

        // Also dispatch event for compatibility with existing code
        window.dispatchEvent(new CustomEvent('replaceTempChat', {
          detail: {
            tempId: chatId,
            realId: actualChatId,
            attempt: 1
          }
        }));
      }

      // Create or update the chat in the database
      try {
        logger.debug('Creating/updating chat before sending message:', {
          chatId: actualChatId,
          model,
          brainstormMode
        });

        await chatService.updateChat(actualChatId, {
          chat_title: "New Chat",
          brainstorm_mode: brainstormMode,
          brainstorm_settings: {
            ...brainstormSettings,
            mainModel: model
          }
        });

        // Update the chat in the store
        dispatch({
          type: 'UPDATE_CHAT',
          payload: {
            chatId: actualChatId,
            updates: {
              brainstorm_mode: brainstormMode,
              brainstorm_settings: {
                ...brainstormSettings,
                mainModel: model
              }
            }
          }
        });

        // Wait a short time to ensure the chat is created in the database
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (chatError) {
        logger.error('Error creating/updating chat:', chatError);
        // Continue with the message sending even if chat creation fails
        // The API might create the chat if it doesn't exist
      }

      // Add the user message to the store immediately (optimistic update)
      const timestamp = new Date().toISOString();

      // Check if a similar message already exists in the store
      const currentChat = useChatStore.getState().chats.find(c => c.chat_id === actualChatId);
      const hasSimilarMessage = currentChat?.chat_history.some(msg =>
        msg.user_input === messageText &&
        Math.abs(new Date(msg.timestamp).getTime() - Date.now()) < 5000
      );

      // Only add the message if it doesn't already exist
      if (!hasSimilarMessage) {
        const userMessage = {
          user_input: messageText,
          api_response: '',
          timestamp,
          model,
          credits_deducted: '0',
          inputType: brainstormMode ? 'brainstorm' : 'text',
          outputType: brainstormMode ? 'brainstorm' : 'text',
          contextId: actualChatId
        };

        logger.debug('Adding optimistic user message to store:', {
          chatId: actualChatId,
          messageText: messageText.substring(0, 30) + (messageText.length > 30 ? '...' : ''),
          timestamp,
          inputType: brainstormMode ? 'brainstorm' : 'text',
          outputType: brainstormMode ? 'brainstorm' : 'text'
        });

        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            chatId: actualChatId,
            message: userMessage
          }
        });
      } else {
        logger.debug('Skipping optimistic update - similar message already exists:', {
          chatId: actualChatId,
          messageText: messageText.substring(0, 30) + (messageText.length > 30 ? '...' : '')
        });
      }

      // Reorder the chat to bring it to the top
      dispatch({
        type: 'REORDER_CHATS',
        payload: actualChatId
      });

      // Save the user message to the database
      try {
        logger.debug('Saving user message to database:', {
          chatId: actualChatId,
          messageText,
          model
        });

        // Call the saveMessage API to save the user message
        const response = await fetch('/api/chat/saveMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: actualChatId,
            message: {
              userInput: messageText,
              timestamp: timestamp,
              model,
              inputType: brainstormMode ? 'brainstorm' : 'text',
              outputType: brainstormMode ? 'brainstorm' : 'text',
              contextId: actualChatId
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          logger.error('Error saving user message:', errorData);
          throw new Error(errorData.message || 'Failed to save user message');
        }

        // Wait a short time to ensure the message is saved in the database
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (messageError) {
        logger.error('Error saving user message:', messageError);
        // Continue with the message sending even if message saving fails
        // The API might handle this case
      }

      // Start streaming using the streamingService
      const streamingResult = await streamingService.startStreaming({
        chatId: actualChatId,
        messageText,
        model,
        brainstormMode,
        brainstormSettings,
        onError: (error) => {
          logger.error('Streaming error:', error);

          // Set loading state to false in case of error
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      });

      if (!streamingResult?.success) {
        const errorMessage = streamingResult && 'error' in streamingResult
          ? streamingResult.error
          : 'Failed to get AI response';
        throw new Error(errorMessage);
      }

      return {
        success: true,
        message: 'Message sent successfully',
        chatId: actualChatId,
        replacementInfo
      };
    } catch (error: any) {
      logger.error('Send message error:', error);

      // Show error toast
      toast.error(error.message || 'Failed to send message');

      // Set loading state to false in case of error
      useChatStore.getState().dispatch({
        type: 'SET_LOADING',
        payload: false
      });

      return {
        success: false,
        message: error.message || 'Failed to send message'
      };
    }
  },

  /**
   * Create a user message object
   */
  createUserMessage(text: string, chatId: string, isBrainstormChat = false): ChatMessage {
    return {
      userInput: text,
      apiResponse: '',
      timestamp: new Date().toISOString(),
      inputType: isBrainstormChat ? 'brainstorm' : 'text',
      outputType: isBrainstormChat ? 'brainstorm' : 'text',
      contextId: chatId,
      chat_id: chatId,
      messageId: crypto.randomUUID(),
    };
  },

  /**
   * Create an AI message object from a response
   */
  createAIMessage(response: any, chatId: string): ChatMessage {
    // Determine if this is a brainstorm message
    const isBrainstorm = response.isBrainstorm;
    const isSummary = isBrainstorm && response.aiMessage?.output_type === 'summary';

    return {
      userInput: '',
      apiResponse: response.aiMessage?.api_response || '',
      inputType: isBrainstorm ? 'brainstorm' : 'text',
      outputType: isSummary ? 'summary' : (isBrainstorm ? 'brainstorm' : 'text'),
      timestamp: new Date().toISOString(),
      contextId: chatId,
      chat_id: chatId,
      messageId: crypto.randomUUID(),
      model: isBrainstorm ? response.model?.summary : response.model,
      tokensUsed: response.tokensUsed,
      creditsDeducted: response.creditsDeducted,
      brainstormMessages: response.brainstormMessages,
    };
  }
};