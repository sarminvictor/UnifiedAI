'use client';

import { create } from 'zustand';
import { ChatState, ChatAction } from './types';
import { ModelName } from '@/types/ai.types';
import { logger } from '@/utils/logger';

export const useChatStore = create<ChatState>((set, get) => {
  // Make the store accessible globally for the chat service
  if (typeof window !== 'undefined') {
    (window as any).__CHAT_STORE__ = { getState: get };
  }

  return {
    chats: [],
    currentChatId: null,
    selectedModel: ModelName.ChatGPT,
    isLoading: false,
    credits: null,
    streamingMessages: {},
    messageVisibility: {},
    dispatch: (action: ChatAction) => {
      logger.debug('Chat Store Action:', action.type);
      logger.debug('Previous State:', {
        currentChatId: get().currentChatId,
        chatsCount: get().chats.length,
        selectedModel: get().selectedModel
      });

      switch (action.type) {
        case 'SET_CHATS': {
          // Filter out empty chats except for the current one and temporary chats
          const currentChatId = get().currentChatId;
          const isCurrentChatTemp = currentChatId && currentChatId.startsWith('temp_');

          const filteredChats = action.payload.filter(chat =>
            chat.isTemp ||
            chat.chat_id.startsWith('temp_') ||
            chat.chat_history?.length > 0 ||
            chat.chat_id === currentChatId
          );

          // Check if the current chat is included in the filtered chats
          const currentChatIncluded = filteredChats.some(chat => chat.chat_id === currentChatId);

          // If the current chat is temporary and not included, we need to add it
          let finalChats = filteredChats;
          if (isCurrentChatTemp && !currentChatIncluded && currentChatId) {
            // Find the current chat in the current state
            const currentChats = get().chats;
            const currentChat = currentChats.find(chat => chat.chat_id === currentChatId);
            if (currentChat) {
              logger.debug('Preserving current temporary chat in SET_CHATS:', { chatId: currentChatId });
              finalChats = [currentChat, ...filteredChats];
            }
          }

          // Sort chats by updated_at timestamp, newest first
          finalChats.sort((a, b) => {
            const dateA = new Date(a.updated_at).getTime();
            const dateB = new Date(b.updated_at).getTime();
            return dateB - dateA; // Descending order (newest first)
          });

          // Update URL when setting chats
          if (currentChatId && !currentChatId.startsWith('temp_')) {
            window?.history?.pushState({}, '', `/c/${currentChatId}`);
          }
          set({ chats: finalChats });
          break;
        }
        case 'SET_CURRENT_CHAT': {
          const chatId = action.payload;
          const previousChatId = get().currentChatId;
          const isNewChatTemp = chatId && chatId.startsWith('temp_');

          // Update URL when changing chats
          if (chatId && !chatId.startsWith('temp_')) {
            window?.history?.pushState({}, '', `/c/${chatId}`);
          } else {
            window?.history?.pushState({}, '', '/');
          }

          // Find the chat and set its model as selected if it exists
          if (chatId) {
            const chat = get().chats.find(c => c.chat_id === chatId);
            if (chat?.model) {
              set({ selectedModel: chat.model });
            } else {
              // If no model set for this chat, use ChatGPT as default
              set({ selectedModel: ModelName.ChatGPT });
            }
          }

          // If we're switching to a server chat, clean up empty temporary chats
          if (chatId && !isNewChatTemp) {
            const chats = [...get().chats];

            // Keep non-temporary chats, temporary chats with messages, and the chat we're switching to
            const cleanedChats = chats.filter(chat =>
              (!chat.chat_id.startsWith('temp_') && !chat.isTemp) || // Keep non-temporary chats
              (chat.chat_history && chat.chat_history.length > 0) || // Keep chats with messages
              chat.chat_id === chatId // Keep the chat we're switching to
            );

            logger.debug('Cleaning up empty temporary chats when switching to server chat:', {
              previousCount: chats.length,
              newCount: cleanedChats.length
            });

            set({
              chats: cleanedChats,
              currentChatId: chatId
            });
          } else if (isNewChatTemp && chatId === previousChatId) {
            // If we're clicking on the same temporary chat again, make sure we don't lose any chats
            logger.debug('Clicking on the same temporary chat again:', { chatId });

            // Just update the currentChatId without modifying the chat list
            set({ currentChatId: chatId });
          } else if (isNewChatTemp) {
            // If we're switching to a different temporary chat, we should clean up other empty temporary chats
            const chats = [...get().chats];

            // Keep non-temporary chats, temporary chats with messages, and the chat we're switching to
            const cleanedChats = chats.filter(chat =>
              (!chat.chat_id.startsWith('temp_') && !chat.isTemp) || // Keep non-temporary chats
              (chat.chat_history && chat.chat_history.length > 0) || // Keep chats with messages
              chat.chat_id === chatId // Keep the chat we're switching to
            );

            logger.debug('Cleaning up empty temporary chats when switching to another temporary chat:', {
              previousCount: chats.length,
              newCount: cleanedChats.length
            });

            set({
              chats: cleanedChats,
              currentChatId: chatId
            });
          } else {
            set({ currentChatId: chatId });
          }

          break;
        }
        case 'SET_MODEL': {
          const currentChatId = get().currentChatId;
          const chats = [...get().chats];

          // Update the model for the current chat
          if (currentChatId) {
            const chatIndex = chats.findIndex(c => c.chat_id === currentChatId);
            if (chatIndex !== -1) {
              // Preserve existing brainstorm settings
              const existingChat = chats[chatIndex];
              logger.debug('Preserving brainstorm settings when setting model:', {
                brainstorm_mode: existingChat.brainstorm_mode,
                brainstorm_settings: existingChat.brainstorm_settings
              });

              chats[chatIndex] = {
                ...existingChat,
                model: action.payload,
                // Explicitly preserve brainstorm settings
                brainstorm_mode: existingChat.brainstorm_mode,
                brainstorm_settings: existingChat.brainstorm_settings
              };
              set({ chats });
            }
          }

          set({ selectedModel: action.payload });
          break;
        }
        case 'SET_LOADING':
          set({ isLoading: action.payload });
          break;
        case 'SET_CREDITS': {
          // Convert string credits to number if needed
          const creditsValue = typeof action.payload === 'string'
            ? parseFloat(action.payload as string)
            : (action.payload as number);

          // Only update if it's a valid number
          if (!isNaN(creditsValue)) {
            logger.debug('Setting credits:', {
              previous: get().credits,
              new: creditsValue
            });
            set({ credits: creditsValue });
          } else {
            logger.warn('Invalid credits value:', { value: action.payload });
          }
          break;
        }
        case 'DEDUCT_CREDITS': {
          // Convert string credits to number if needed
          const creditsDeducted = typeof action.payload === 'string'
            ? parseFloat(action.payload as string)
            : (action.payload as number);

          // Only update if it's a valid number
          if (!isNaN(creditsDeducted)) {
            const currentCredits = get().credits || 0;
            const newCredits = currentCredits - creditsDeducted;

            logger.debug('Deducting credits:', {
              previous: currentCredits,
              creditsDeducted: creditsDeducted,
              new: newCredits
            });

            set({ credits: newCredits });
          } else {
            logger.warn('Invalid credits deduction value:', { value: action.payload });
          }
          break;
        }
        case 'ADD_MESSAGE': {
          const { chatId, message } = action.payload;
          const chats = [...get().chats];
          const chatIndex = chats.findIndex(c => c.chat_id === chatId);

          if (chatIndex !== -1) {
            const existingChat = chats[chatIndex];

            // Enhanced duplicate detection logic
            const isDuplicate = existingChat.chat_history?.some(m => {
              // For user messages (with user_input but no api_response)
              if (message.user_input && !message.api_response) {
                return m.user_input === message.user_input &&
                  Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000;
              }

              // For AI messages or combined messages
              return m.timestamp === message.timestamp &&
                m.outputType === message.outputType &&
                m.api_response === message.api_response;
            });

            if (isDuplicate) {
              logger.debug('Skipping duplicate message in ADD_MESSAGE:', {
                chatId,
                messageType: message.outputType,
                timestamp: message.timestamp,
                userInput: message.user_input?.substring(0, 20) + (message.user_input?.length > 20 ? '...' : ''),
                apiResponseLength: message.api_response?.length || 0
              });
              break;
            }

            // Check if this is a brainstorm chat
            const isBrainstormChat = existingChat.brainstorm_mode;

            // Check if this is a user message (has user input but no API response)
            const isUserMessage = message.user_input && !message.api_response;

            // Process message types for brainstorm mode
            let processedMessage = { ...message };

            if (isBrainstormChat) {
              if (isUserMessage) {
                // For user messages in a brainstorm chat, ensure inputType='text' and outputType='brainstorm'
                processedMessage.inputType = 'text';
                processedMessage.outputType = 'brainstorm';

                // Only log for user messages in brainstorm mode
                logger.debug('Setting types for user message in ADD_MESSAGE:', {
                  userInput: message.user_input?.substring(0, 30) + (message.user_input?.length > 30 ? '...' : ''),
                  inputType: processedMessage.inputType,
                  outputType: processedMessage.outputType,
                  isBrainstormChat
                });
              } else if (!message.outputType || !message.inputType) {
                // For AI messages in a brainstorm chat, set both types to 'brainstorm' if not already set
                processedMessage.inputType = 'brainstorm';
                processedMessage.outputType = 'brainstorm';
              }
            }

            // Add model to the message if not present
            const messageWithModel = {
              ...processedMessage,
              model: processedMessage.model || get().selectedModel
            };

            // Only log detailed message info for important messages
            if (isUserMessage || message.outputType === 'summary') {
              logger.debug('Adding message to chat:', {
                chatId,
                messageType: messageWithModel.outputType,
                model: messageWithModel.model,
                userInput: isUserMessage ? (message.user_input?.substring(0, 20) + (message.user_input?.length > 20 ? '...' : '')) : undefined,
                isFirstUserMessage: isUserMessage,
                isBrainstormChat
              });
            }

            chats[chatIndex] = {
              ...existingChat,
              chat_history: [...(existingChat.chat_history || []), messageWithModel],
              model: get().selectedModel, // Update chat's model
              updated_at: new Date().toISOString(),
              // Preserve brainstorm settings
              brainstorm_mode: existingChat.brainstorm_mode,
              brainstorm_settings: existingChat.brainstorm_settings
            };
            set({ chats });
          } else {
            logger.error('Failed to add message: Chat not found', { chatId });
          }
          break;
        }
        case 'REORDER_CHATS': {
          const chatId = action.payload;
          const chats = [...get().chats];
          const chatIndex = chats.findIndex(c => c.chat_id === chatId);

          if (chatIndex !== -1) {
            const [chat] = chats.splice(chatIndex, 1);
            // Update the updated_at timestamp to ensure proper ordering
            const updatedChat = {
              ...chat,
              updated_at: new Date().toISOString()
            };
            chats.unshift(updatedChat);
            set({ chats });
          }
          break;
        }
        case 'UPDATE_CHAT': {
          const { chatId, updates } = action.payload;
          const chats = [...get().chats];
          const chatIndex = chats.findIndex(c => c.chat_id === chatId);

          if (chatIndex !== -1) {
            const existingChat = chats[chatIndex];
            logger.debug('Updating chat:', {
              chatId,
              updates,
              existingBrainstormMode: existingChat.brainstorm_mode
            });

            // Ensure we preserve brainstorm settings if not explicitly updated
            if (updates.brainstorm_mode === undefined && updates.brainstorm_settings === undefined) {
              updates.brainstorm_mode = existingChat.brainstorm_mode;
              updates.brainstorm_settings = existingChat.brainstorm_settings;
            }

            chats[chatIndex] = {
              ...existingChat,
              ...updates
            };
            set({ chats });
          }
          break;
        }
        case 'REPLACE_TEMP_CHAT': {
          const { tempId, realId, updates } = action.payload;
          const chats = [...get().chats];
          const chatIndex = chats.findIndex(c => c.chat_id === tempId);

          if (chatIndex !== -1) {
            const existingChat = chats[chatIndex];
            chats[chatIndex] = {
              ...existingChat,
              chat_id: realId,
              isTemp: false, // Remove temp flag
              ...updates,
              // Preserve brainstorm settings
              brainstorm_mode: existingChat.brainstorm_mode,
              brainstorm_settings: existingChat.brainstorm_settings
            };
            // Update URL when replacing temp chat
            window?.history?.pushState({}, '', `/c/${realId}`);
            set({
              chats,
              currentChatId: realId
            });
          }
          break;
        }
        case 'DELETE_CHAT': {
          const chatId = action.payload;
          const currentChatId = get().currentChatId;

          set(state => ({
            chats: state.chats.filter(chat => chat.chat_id !== chatId),
            currentChatId: currentChatId === chatId ? null : currentChatId
          }));

          // Clear URL if deleting current chat
          if (currentChatId === chatId) {
            window?.history?.pushState({}, '', '/');
          }
          break;
        }
        case 'SET_CHATS_PRESERVE_SELECTION': {
          const { chats, preserveId } = action.payload;

          // Always keep temporary chats that are currently selected
          const isPreserveIdTemp = preserveId && preserveId.startsWith('temp_');

          // Filter out empty chats except for the current one and temporary chats
          const filteredChats = chats.filter(chat =>
            chat.isTemp ||
            chat.chat_id.startsWith('temp_') ||
            chat.chat_history?.length > 0 ||
            chat.chat_id === preserveId
          );

          // Check if preserveId still exists in the new chat list
          const chatExists = filteredChats.some(chat => chat.chat_id === preserveId);

          // If the preserveId is a temporary ID and doesn't exist in the filtered chats,
          // we need to find the temporary chat from the current state and add it
          let finalChats = filteredChats;
          if (isPreserveIdTemp && !chatExists && preserveId) {
            const currentChats = get().chats;
            const tempChat = currentChats.find(chat => chat.chat_id === preserveId);
            if (tempChat) {
              logger.debug('Preserving temporary chat:', { chatId: preserveId });
              finalChats = [tempChat, ...filteredChats];
            }
          }

          // Sort chats by updated_at timestamp, newest first
          finalChats.sort((a, b) => {
            const dateA = new Date(a.updated_at).getTime();
            const dateB = new Date(b.updated_at).getTime();
            return dateB - dateA; // Descending order (newest first)
          });

          set({
            chats: finalChats,
            // Only keep the currentChatId if it exists in the new chat list or is a temp chat
            currentChatId: chatExists || isPreserveIdTemp ? preserveId : get().currentChatId
          });

          // Update URL only if needed and the chat exists and is not temporary
          if (preserveId && chatExists && !isPreserveIdTemp) {
            window?.history?.pushState({}, '', `/c/${preserveId}`);
          }
          break;
        }
        case 'START_STREAMING_MESSAGE': {
          const { chatId, messageId, model } = action.payload;
          logger.debug('Starting streaming message:', { chatId, messageId, model });

          // Create nested structure if it doesn't exist
          const currentStreamingMessages = { ...get().streamingMessages };
          if (!currentStreamingMessages[chatId]) {
            currentStreamingMessages[chatId] = {};
          }

          // Add the new streaming message
          currentStreamingMessages[chatId][messageId] = {
            id: messageId,
            chatId,
            text: '',
            model,
            isComplete: false,
            startTime: new Date(),
            sequence: 0
          };

          set({ streamingMessages: currentStreamingMessages });
          break;
        }

        case 'UPDATE_STREAMING_MESSAGE': {
          const { chatId, messageId, token, sequence } = action.payload;
          // Only log occasionally to reduce log volume
          if (sequence % 500 === 0) {
            logger.debug('Updating streaming message:', {
              chatId,
              messageId,
              tokenCount: sequence,
            });
          }

          // Get current state
          const currentStreamingMessages = { ...get().streamingMessages };

          // Skip if chat or message doesn't exist
          if (!currentStreamingMessages[chatId] || !currentStreamingMessages[chatId][messageId]) {
            logger.warn('Cannot update non-existent streaming message:', { chatId, messageId });
            break;
          }

          // Get the current message
          const currentMessage = currentStreamingMessages[chatId][messageId];

          // Only update if the sequence is newer
          if (sequence < currentMessage.sequence) {
            // Skip logging for out-of-order tokens
            break;
          }

          // Update the message
          currentStreamingMessages[chatId][messageId] = {
            ...currentMessage,
            text: currentMessage.text + token,
            sequence: Math.max(currentMessage.sequence, sequence)
          };

          set({ streamingMessages: currentStreamingMessages });
          break;
        }

        case 'COMPLETE_STREAMING_MESSAGE': {
          const { chatId, messageId, finalText, credits } = action.payload;
          logger.debug('Completing streaming message:', {
            chatId,
            messageId,
            hasFinalText: !!finalText,
            credits,
            messageType: messageId.startsWith('brainstorm-') ? 'brainstorm' :
              messageId.startsWith('summary-') ? 'summary' : 'regular'
          });

          // Get current state
          const currentStreamingMessages = { ...get().streamingMessages };

          // Skip if chat or message doesn't exist
          if (!currentStreamingMessages[chatId] || !currentStreamingMessages[chatId][messageId]) {
            logger.warn('Cannot complete non-existent streaming message:', { chatId, messageId });
            break;
          }

          // Get the current message
          const currentMessage = currentStreamingMessages[chatId][messageId];

          // Update the streaming message as complete
          currentStreamingMessages[chatId][messageId] = {
            ...currentMessage,
            text: finalText || currentMessage.text,
            isComplete: true,
            completeTime: new Date(),
            credits
          };

          // Add the completed message to the chat history
          const chats = [...get().chats];
          const chatIndex = chats.findIndex(c => c.chat_id === chatId);

          if (chatIndex !== -1) {
            const chat = chats[chatIndex];

            // Determine input and output types based on message content and context
            let inputType = 'text';
            let outputType = 'text';

            // Check if this is a brainstorm chat
            const isBrainstormChat = chat.brainstorm_mode;

            // Check if this is a user message
            // User messages typically start with 'user-'
            const isUserMessage = messageId.startsWith('user-');

            // Check if this is the first user message in the chat
            const isFirstUserMessage = isUserMessage && (chat.chat_history.length === 0 || !chat.chat_history.some(msg => msg.user_input && !msg.api_response));

            // Check if this is a brainstorm message
            const isBrainstormMessage = messageId.startsWith('brainstorm-');

            if (isBrainstormChat) {
              if (isFirstUserMessage) {
                // For the first user message in a brainstorm chat, set inputType='text' and outputType='brainstorm'
                inputType = 'text';
                outputType = 'brainstorm';

                // Log for the first user message in brainstorm mode
                logger.debug('Setting types for first user message in streaming:', {
                  messageId,
                  inputType,
                  outputType,
                  isBrainstormChat,
                  isFirstUserMessage: true,
                  credits
                });
              } else if (isUserMessage) {
                // For subsequent user messages in a brainstorm chat
                inputType = 'brainstorm';
                outputType = 'brainstorm';

                logger.debug('Setting types for subsequent user message in streaming:', {
                  messageId,
                  inputType,
                  outputType,
                  isBrainstormChat,
                  isFirstUserMessage: false,
                  credits
                });
              } else {
                // For AI messages in a brainstorm chat, set both types to 'brainstorm'
                inputType = 'brainstorm';
                outputType = 'brainstorm';
              }
            }

            // Check if this is a summary message
            if (messageId.startsWith('summary-')) {
              inputType = 'brainstorm';
              outputType = 'summary';

              logger.debug('Setting types for summary message in streaming:', {
                messageId,
                inputType,
                outputType,
                isBrainstormChat,
                credits
              });
            }

            chats[chatIndex] = {
              ...chat,
              chat_history: [
                ...chat.chat_history,
                {
                  api_response: finalText || currentMessage.text,
                  user_input: '',
                  timestamp: currentMessage.startTime.toISOString(),
                  model: currentMessage.model,
                  credits_deducted: credits || '0',
                  inputType,
                  outputType
                }
              ],
              updated_at: new Date().toISOString()
            };
          }

          // Update credits if provided
          let updatedCredits = get().credits;
          if (credits && typeof credits === 'string') {
            const creditsValue = parseFloat(credits);
            if (!isNaN(creditsValue) && updatedCredits !== null) {
              updatedCredits = updatedCredits - creditsValue;
              logger.debug('Deducting credits in COMPLETE_STREAMING_MESSAGE:', {
                messageId,
                creditsValue,
                previousCredits: get().credits,
                newCredits: updatedCredits
              });
            } else {
              logger.warn('Invalid credits value in COMPLETE_STREAMING_MESSAGE:', {
                messageId,
                credits,
                parsedValue: creditsValue,
                isNaN: isNaN(creditsValue),
                currentCredits: get().credits
              });
            }
          } else {
            logger.debug('No credits to deduct in COMPLETE_STREAMING_MESSAGE:', {
              messageId,
              credits
            });
          }

          set({
            streamingMessages: currentStreamingMessages,
            chats,
            credits: updatedCredits
          });

          // Reorder the chat to bring it to the top
          if (chatIndex !== -1) {
            get().dispatch({ type: 'REORDER_CHATS', payload: chatId });
          }

          break;
        }

        case 'REMOVE_STREAMING_MESSAGE': {
          const { chatId, messageId } = action.payload;
          logger.debug('Removing streaming message:', { chatId, messageId });

          // Get current state
          const currentStreamingMessages = { ...get().streamingMessages };

          // Skip if chat or message doesn't exist
          if (!currentStreamingMessages[chatId] || !currentStreamingMessages[chatId][messageId]) {
            break;
          }

          // Remove the message
          delete currentStreamingMessages[chatId][messageId];

          // Remove the chat entry if it's empty
          if (Object.keys(currentStreamingMessages[chatId]).length === 0) {
            delete currentStreamingMessages[chatId];
          }

          set({ streamingMessages: currentStreamingMessages });
          break;
        }

        case 'CLEAR_STREAMING_MESSAGES': {
          const { chatId } = action.payload;
          logger.debug('Clearing all streaming messages for chat:', { chatId });

          // Get current state
          const currentStreamingMessages = { ...get().streamingMessages };

          // Remove all messages for this chat
          if (currentStreamingMessages[chatId]) {
            delete currentStreamingMessages[chatId];
          }

          set({ streamingMessages: currentStreamingMessages });
          break;
        }

        case 'SET_MESSAGE_VISIBILITY': {
          const { messageId, isVisible } = action.payload;

          // Update visibility state
          const messageVisibility = {
            ...get().messageVisibility,
            [messageId]: isVisible
          };

          set({ messageVisibility });
          break;
        }

        case 'SYNC_CHAT': {
          const { chatId, chatData } = action.payload;
          logger.debug('Syncing chat with backend data:', { chatId });

          const chats = [...get().chats];
          const chatIndex = chats.findIndex(c => c.chat_id === chatId);

          if (chatIndex === -1) {
            logger.warn('Cannot sync non-existent chat:', { chatId });
            break;
          }

          // Get existing chat
          const existingChat = chats[chatIndex];

          // Check if this is a brainstorm chat
          const isBrainstormChat = existingChat.brainstorm_mode || chatData.brainstorm_mode;

          logger.debug('Processing messages from server:', {
            chatId,
            messageCount: chatData.chat_history.length,
            isBrainstormChat
          });

          // Create a map of existing messages for more sophisticated duplicate detection
          const existingMessages = new Map();
          existingChat.chat_history.forEach(msg => {
            // For user messages, use content as the key
            if (msg.user_input && !msg.api_response) {
              const key = `user-${msg.user_input.substring(0, 100)}`;
              existingMessages.set(key, msg);
            } else {
              // For AI messages or combined messages, use timestamp and content
              const key = `${msg.timestamp}-${msg.user_input}-${msg.api_response.substring(0, 100)}`;
              existingMessages.set(key, msg);
            }
          });

          // Process incoming messages to ensure they have inputType and outputType fields
          const processedChatHistory = chatData.chat_history.map(msg => {
            // Determine if this is a user message (has user input but no API response)
            const isUserMessage = msg.user_input && !msg.api_response;

            // Get the original input and output types from the message
            const originalInputType = (msg as any).input_type || msg.inputType || 'text';
            const originalOutputType = (msg as any).output_type || msg.outputType || 'text';

            // Initialize input and output types with the original values
            let inputType = originalInputType;
            let outputType = originalOutputType;

            // Special case for user messages in a brainstorm chat
            if (isBrainstormChat && isUserMessage) {
              // For user messages in a brainstorm chat, ensure inputType is 'text' and outputType is 'brainstorm'
              inputType = 'text';
              outputType = 'brainstorm';
            }
            // For AI messages in a brainstorm chat
            else if (isBrainstormChat && !isUserMessage) {
              // Set both types to 'brainstorm' for AI messages in a brainstorm chat
              inputType = 'brainstorm';
              outputType = 'brainstorm';
            }

            // Special case for summary messages
            if (originalOutputType === 'summary' || (msg.api_response && !msg.user_input && msg.api_response.includes('Summary of the brainstorm'))) {
              inputType = 'brainstorm';
              outputType = 'summary';
            }

            return {
              ...msg,
              inputType,
              outputType
            };
          });

          // Find all user messages from the server
          const userMessagesFromServer = processedChatHistory.filter(msg =>
            msg.user_input && !msg.api_response &&
            msg.inputType === 'text' && msg.outputType === 'brainstorm'
          );

          // Log summary of user messages instead of individual messages
          if (userMessagesFromServer.length > 0 && isBrainstormChat) {
            logger.debug('Found user messages from server:', {
              count: userMessagesFromServer.length
            });
          }

          // Filter out messages that already exist in our store
          const newMessages = processedChatHistory.filter(msg => {
            // For user messages, check by content
            if (msg.user_input && !msg.api_response) {
              const key = `user-${msg.user_input.substring(0, 100)}`;

              // Check if this is a user message in a brainstorm chat
              const isUserMessageInBrainstorm =
                (msg.inputType === 'text' && msg.outputType === 'brainstorm') ||
                ((msg as any).input_type === 'text' && (msg as any).output_type === 'brainstorm');

              // Special case: If this is a user message in a brainstorm chat,
              // check if we already have a message with the same user input but with
              // different inputType/outputType values
              if (isUserMessageInBrainstorm && existingMessages.has(key)) {
                const existingMsg = existingMessages.get(key);
                // If the existing message doesn't have the correct types for a brainstorm user message,
                // we should include this message from the server
                if (existingMsg.inputType !== 'text' || existingMsg.outputType !== 'brainstorm') {
                  return true;
                }
              }

              // Always include user messages from the server in brainstorm mode
              // This ensures they're not filtered out even if they exist in the store
              if (isUserMessageInBrainstorm) {
                return true;
              }

              return !existingMessages.has(key);
            }

            // For AI messages or combined messages, check by timestamp and content
            const key = `${msg.timestamp}-${msg.user_input}-${msg.api_response.substring(0, 100)}`;
            return !existingMessages.has(key);
          });

          // Log summary of sync results
          logger.debug('Sync results:', {
            existingCount: existingChat.chat_history.length,
            incomingCount: chatData.chat_history.length,
            newCount: newMessages.length,
            userMessagesCount: userMessagesFromServer.length
          });

          // Merge and sort messages
          const mergedHistory = [
            ...existingChat.chat_history,
            ...newMessages
          ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

          // Process the merged history to ensure all user messages have the correct types
          const processedMergedHistory = mergedHistory.map(msg => {
            // Check if this is a user message in a brainstorm chat
            const isUserMessage = msg.user_input && !msg.api_response;

            if (isBrainstormChat && isUserMessage) {
              // Ensure all user messages have inputType='text' and outputType='brainstorm'
              return {
                ...msg,
                inputType: 'text',
                outputType: 'brainstorm'
              };
            }

            return msg;
          });

          // Ensure user messages are included
          let finalHistory = processedMergedHistory;

          // If we have user messages from the server but none in the merged history,
          // add them explicitly
          if (userMessagesFromServer.length > 0 && isBrainstormChat && !finalHistory.some(msg =>
            msg.user_input && !msg.api_response &&
            msg.inputType === 'text' && msg.outputType === 'brainstorm'
          )) {
            logger.debug('Adding user messages to merged history');

            // Combine all messages and sort them by timestamp to maintain chronological order
            finalHistory = [
              ...finalHistory.filter(msg => !(msg.user_input && !msg.api_response)),
              ...userMessagesFromServer
            ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          }

          // Update the chat with merged data and ensure updated_at is current
          chats[chatIndex] = {
            ...existingChat,
            ...chatData,
            chat_history: finalHistory,
            updated_at: new Date().toISOString() // Ensure the chat has the latest timestamp
          };

          // Re-sort chats by updated_at timestamp, newest first
          chats.sort((a, b) => {
            const dateA = new Date(a.updated_at).getTime();
            const dateB = new Date(b.updated_at).getTime();
            return dateB - dateA; // Descending order (newest first)
          });

          set({ chats });
          break;
        }
      }
    }
  };
});

// Add selectors for filtered message views
export const getVisibleMessages = (state: ChatState, chatId: string) => {
  const chat = state.chats.find(c => c.chat_id === chatId);
  if (!chat) return [];

  return chat.chat_history.filter(msg => {
    // Skip system messages
    if (msg.inputType === 'system') return false;

    // Skip empty messages
    if (!msg.user_input && !msg.api_response) return false;

    // Check visibility override
    const messageId = `${chatId}-${msg.timestamp}`;
    if (messageId in state.messageVisibility) {
      return state.messageVisibility[messageId];
    }

    return true;
  });
};

export const getStreamingMessages = (state: ChatState, chatId: string) => {
  const messages = state.streamingMessages?.[chatId] ?? {};
  return Object.values(messages);
};

export type ChatDispatch = ChatState['dispatch'];