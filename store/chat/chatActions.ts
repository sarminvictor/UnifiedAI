'use client';

import { useRef, useEffect } from 'react';
import { useChatStore } from './chatStore';
import { messageService } from '@/services/messageService';
import { chatService } from '@/services/chatService';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { generateChatId } from '@/utils/chatUtils';
import { toast } from 'sonner'; // Replace the old toast import with sonner
import { useSWRConfig } from 'swr';
import { ModelName } from '@/types/ai.types';
import { DEFAULT_BRAINSTORM_SETTINGS } from '@/types/chat/settings';

export const useChatActions = () => {
  const dispatch = useChatStore(state => state.dispatch);
  const store = useChatStore();
  const inputRef = useRef<HTMLInputElement>(null);
  // Add tracking for replaced IDs
  const replacedChatIds = useRef<Map<string, string>>(new Map());
  // Track if brainstorm is complete to prevent adding duplicate summary
  const brainstormCompleteStatus = useRef<Record<string, boolean>>({});

  // Listen for temp chat replacements from message service
  useEffect(() => {
    const handleReplaceTempChat = (event: CustomEvent) => {
      const { tempId, realId } = event.detail;
      if (tempId && realId) {
        // Track this replacement to avoid duplicates
        replacedChatIds.current.set(tempId, realId);

        dispatch({
          type: 'REPLACE_TEMP_CHAT',
          payload: {
            tempId,
            realId,
            updates: {}
          }
        });
      }
    };

    window.addEventListener('replaceTempChat', handleReplaceTempChat as EventListener);

    return () => {
      window.removeEventListener('replaceTempChat', handleReplaceTempChat as EventListener);
    };
  }, [dispatch]);

  // Listen for completed chat messages from streaming
  useEffect(() => {
    // Keep track of processed message IDs to avoid duplicates
    const processedMessageIds = new Set<string>();
    // Track streaming messages that have been processed
    const processedStreamingIds = new Set<string>();

    // Handle streaming message processed event
    const handleStreamingMessageProcessed = (event: CustomEvent) => {
      const { id, chatId } = event.detail;
      if (!id || !chatId) return;

      // Create a unique key for this streaming message
      const streamingKey = `${chatId}-${id}`;

      // Mark this streaming message as processed
      processedStreamingIds.add(streamingKey);

      logger.debug('Streaming message processed:', {
        id,
        chatId,
        timestamp: new Date().toISOString()
      });
    };

    const handleChatMessageReceived = (event: CustomEvent) => {
      const { chatId, message } = event.detail;
      if (!chatId || !message) return;

      // If brainstorm is complete for this chat and this is a summary message,
      // skip it to prevent duplicates
      if (brainstormCompleteStatus.current[chatId] && message.outputType === 'summary') {
        logger.debug('Skipping summary message after brainstorm complete:', {
          chatId,
          timestamp: message.timestamp
        });
        return;
      }

      // Create a unique ID for this message to detect duplicates
      // Include more properties to make the ID more unique
      const messageId = `${chatId}-${message.timestamp}-${message.outputType}-${message.inputType}-${message.model}-${message.userInput?.length || 0}-${message.apiResponse?.length || 0}`;

      // Skip if we've already processed this message
      if (processedMessageIds.has(messageId)) {
        logger.debug('Skipping duplicate message:', {
          messageId,
          outputType: message.outputType,
          timestamp: message.timestamp
        });
        return;
      }

      // Check if this message already exists in the chat store
      const existingChat = store.chats.find(c => c.chat_id === chatId);
      if (existingChat) {
        const existingMessage = existingChat.chat_history.find(m =>
          m.timestamp === message.timestamp &&
          m.outputType === message.outputType &&
          m.inputType === message.inputType &&
          m.api_response === message.apiResponse &&
          m.user_input === message.userInput
        );

        if (existingMessage) {
          logger.debug('Skipping message already in chat store:', {
            chatId,
            messageType: message.outputType,
            timestamp: message.timestamp,
            apiResponseLength: message.apiResponse?.length || 0
          });
          return;
        }
      }

      // Check if this message came from a streaming message that's already been processed
      if (message.messageId) {
        const streamingKey = `${chatId}-${message.messageId}`;
        if (processedStreamingIds.has(streamingKey)) {
          logger.debug('Skipping message from already processed streaming message:', {
            chatId,
            messageId: message.messageId,
            timestamp: message.timestamp
          });
          return;
        }
      }

      // Mark this message as processed
      processedMessageIds.add(messageId);

      logger.debug('Chat message received from streaming:', {
        chatId,
        messageType: message.outputType,
        model: message.model,
        textLength: message.apiResponse?.length || 0,
        timestamp: message.timestamp
      });

      // Add the message to the chat store
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          chatId,
          message
        }
      });

      // Reorder chats to ensure this chat is at the top
      dispatch({ type: 'REORDER_CHATS', payload: chatId });

      // If this is an AI response, update the chat title if needed
      if (message.apiResponse && !message.userInput) {
        // Update chat title logic...
      }
    };

    // Handle brainstorm complete event
    const handleBrainstormComplete = (event: CustomEvent) => {
      const { chatId, data } = event.detail;
      if (!chatId) return;

      logger.debug('Brainstorm complete event received:', {
        chatId,
        allMessagesProcessed: data?.allMessagesProcessed,
        creditsDeducted: data?.creditsDeducted,
        credits: data?.credits
      });

      // Mark this chat as complete to prevent adding duplicate summary
      brainstormCompleteStatus.current[chatId] = true;

      // Set loading state to false
      dispatch({ type: 'SET_LOADING', payload: false });

      // Update credits if available (prioritize creditsDeducted over credits)
      const creditsValue = data?.creditsDeducted || data?.credits;
      if (creditsValue) {
        logger.debug('Deducting credits from brainstorm complete:', {
          chatId,
          creditsValue,
          source: data?.creditsDeducted ? 'creditsDeducted' : 'credits'
        });

        dispatch({
          type: 'DEDUCT_CREDITS',
          payload: creditsValue
        });
      } else {
        logger.debug('No credits to deduct from brainstorm complete:', {
          chatId,
          data
        });
      }
    };

    window.addEventListener('chatMessageReceived', handleChatMessageReceived as EventListener);
    window.addEventListener('brainstormComplete', handleBrainstormComplete as EventListener);
    window.addEventListener('streamingMessageProcessed', handleStreamingMessageProcessed as EventListener);

    return () => {
      window.removeEventListener('chatMessageReceived', handleChatMessageReceived as EventListener);
      window.removeEventListener('brainstormComplete', handleBrainstormComplete as EventListener);
      window.removeEventListener('streamingMessageProcessed', handleStreamingMessageProcessed as EventListener);
      // Clear the sets when unmounting
      processedMessageIds.clear();
      processedStreamingIds.clear();
    };
  }, [dispatch]);

  const handleStartNewChat = () => {
    // Check for existing empty chat
    const emptyChat = store.chats.find(chat =>
      !chat.chat_history || chat.chat_history.length === 0
    );

    if (emptyChat) {
      dispatch({ type: 'SET_CURRENT_CHAT', payload: emptyChat.chat_id });
      dispatch({ type: 'SET_MODEL', payload: ModelName.ChatGPT });
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    // Create temporary chat without real ID - this will only be stored locally
    // until the first message is sent
    const tempChat = {
      chat_id: `temp_${Date.now()}`, // Temporary ID for state management only
      chat_title: "New Chat",
      chat_history: [],
      model: ModelName.ChatGPT,
      updated_at: new Date().toISOString(),
      isTemp: true, // Add flag to identify temporary chats
      brainstorm_mode: false,
      brainstorm_settings: DEFAULT_BRAINSTORM_SETTINGS
    };

    logger.debug('Creating new temporary chat:', {
      chatId: tempChat.chat_id,
      isTemp: true
    });

    // Add to beginning of chat list
    dispatch({ type: 'SET_CHATS', payload: [tempChat, ...store.chats] });
    dispatch({ type: 'SET_CURRENT_CHAT', payload: tempChat.chat_id });
    dispatch({ type: 'SET_MODEL', payload: ModelName.ChatGPT });
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelectChat = async (chatId: string) => {
    if (!chatId) return;

    try {
      // Clean up empty chats before selecting new one
      const nonEmptyChats = store.chats.filter(chat =>
        chat.chat_history?.length > 0 || chat.chat_id === chatId
      );
      dispatch({ type: 'SET_CHATS', payload: nonEmptyChats });

      dispatch({ type: 'SET_CURRENT_CHAT', payload: chatId });
      const selectedChat = store.chats.find(chat => chat.chat_id === chatId);
      if (selectedChat) {
        dispatch({ type: 'SET_MODEL', payload: selectedChat.model || ModelName.ChatGPT });
      }
      setTimeout(() => inputRef.current?.focus(), 10);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to access chat';

      toast.error('Error accessing chat', {
        description: errorMessage
      });

      // Clear invalid chat from URL and state
      window?.history?.pushState({}, '', '/');
      dispatch({ type: 'SET_CURRENT_CHAT', payload: null });
    }
  };

  const sendMessage = async (messageText: string) => {
    // Get the current chat ID
    const currentChatId = store.currentChatId;

    if (!currentChatId) {
      logger.error('Cannot send message: No chat selected');
      return;
    }

    // Check if this is a temporary chat ID
    const isTempChat = currentChatId.startsWith('temp_');
    let realChatId = currentChatId;

    // Set loading state
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // Get the current chat to access its brainstorm settings
      const currentChat = store.chats.find(chat => chat.chat_id === currentChatId);
      const brainstormMode = currentChat?.brainstorm_mode || false;
      const brainstormSettings = currentChat?.brainstorm_settings || DEFAULT_BRAINSTORM_SETTINGS;

      logger.debug('Brainstorm settings being saved:', {
        messagesLimit: brainstormSettings.messagesLimit,
        customPrompt: brainstormSettings.customPrompt?.substring(0, 50) + '...',
        summaryModel: brainstormSettings.summaryModel,
        additionalModel: brainstormSettings.additionalModel,
        mainModel: brainstormSettings.mainModel
      });

      // Add the user message to the chat store immediately
      const timestamp = new Date().toISOString();
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          chatId: currentChatId,
          message: {
            user_input: messageText,
            api_response: '',
            timestamp,
            model: store.selectedModel,
            credits_deducted: '0',
            inputType: 'text',
            outputType: brainstormMode ? 'brainstorm' : 'text',
            contextId: '',
            tokensUsed: '0'
          }
        }
      });

      // If this is a temporary chat, we need to create a real chat first
      if (isTempChat) {
        logger.debug('Sending message to temporary chat:', { tempId: currentChatId });

        // Create a more robust replacement promise with retry mechanism
        const replacementPromise = new Promise<string>(async (resolve) => {
          // Track attempts for retry logic
          let attempts = 0;
          const maxAttempts = 3;
          const retryDelay = 2000; // 2 seconds between retries
          let resolved = false;

          // Function to handle replacement event
          const handleReplace = (event: CustomEvent) => {
            const { tempId, realId } = event.detail;
            if (tempId === currentChatId) {
              logger.debug('Temp chat replaced with real chat:', { tempId, realId, attempt: attempts + 1 });
              window.removeEventListener('replaceTempChat', handleReplace as EventListener);
              resolved = true;
              resolve(realId);
            } else {
              logger.debug('Received replaceTempChat event but tempId does not match:', {
                receivedTempId: tempId,
                currentChatId,
                attempt: attempts + 1
              });
            }
          };

          // Add event listener
          logger.debug('Adding replaceTempChat event listener for:', { tempId: currentChatId });
          window.addEventListener('replaceTempChat', handleReplace as EventListener);

          // Retry logic with exponential backoff
          while (attempts < maxAttempts && !resolved) {
            // Wait for the event to be processed
            await new Promise(r => setTimeout(r, retryDelay * Math.pow(2, attempts)));

            if (!resolved) {
              attempts++;
              logger.warn(`Replacement attempt ${attempts}/${maxAttempts} for temp chat:`, { tempId: currentChatId });

              // Re-dispatch the event request on retry (optional)
              if (attempts < maxAttempts) {
                // Could trigger a re-request here if needed
              }
            }
          }

          // Clean up if no replacement happens after all retries
          if (!resolved) {
            window.removeEventListener('replaceTempChat', handleReplace as EventListener);
            logger.error('No replacement received for temp chat after multiple attempts:', { tempId: currentChatId });
            resolve(currentChatId); // Fall back to the original ID
          }
        });

        // Wait for the chat service to create the real chat and dispatch the replacement event
        const result = await messageService.sendMessage(
          currentChatId,
          messageText,
          store.selectedModel,
          brainstormMode,
          brainstormSettings
        );

        // Get the real chat ID from the replacement promise
        const realChatId = await replacementPromise;

        // If we still have a temp ID, something went wrong
        if (realChatId.startsWith('temp_')) {
          logger.warn('Failed to get real chat ID, using temp ID:', { tempId: realChatId });
        }
      } else {
        // For existing chats, just send the message normally
        await messageService.sendMessage(
          currentChatId,
          messageText,
          store.selectedModel,
          brainstormMode,
          brainstormSettings
        );
      }

      // Update the chat order to bring this chat to the top
      dispatch({ type: 'REORDER_CHATS', payload: realChatId });
    } catch (error) {
      logger.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      // Set loading state back to false
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      // Check if deleting current chat
      const isCurrentChat = store.currentChatId === chatId;

      // Remove from UI immediately for better UX
      dispatch({ type: 'DELETE_CHAT', payload: chatId });

      // Reset current chat if needed
      if (isCurrentChat) {
        dispatch({ type: 'SET_CURRENT_CHAT', payload: null });
      }

      // Then try server deletion (for non-temp chats)
      if (!chatId.startsWith('temp_')) {
        const response = await chatService.deleteChat(chatId);

        if (!response.success) {
          throw new Error(response.message || 'Failed to delete chat on server');
        }
      }

      // Force refresh chat list
      await fetch('/api/chat/getChats').then(res => res.json());

    } catch (error) {
      logger.error('Delete Chat Error:', error);
      toast.error('Failed to delete chat', {
        description: 'Please try again later'
      });

      // Refresh chat list on error to ensure sync with server
      const refreshChats = useSWRConfig().mutate;
      refreshChats('/api/chat/getChats');
    }
  };

  const handleEditChat = async (chatId: string, newName: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Optimistically update the chat title and order
      dispatch({
        type: 'UPDATE_CHAT',
        payload: {
          chatId,
          updates: {
            chat_title: newName,
            updated_at: new Date().toISOString()
          }
        }
      });

      // Reorder immediately for better UX
      dispatch({ type: 'REORDER_CHATS', payload: chatId });

      // Then save to server
      const updatedChat = await chatService.updateChat(chatId, {
        chatTitle: newName
      });

      if (!updatedChat.success) {
        // If server update fails, show error but keep optimistic update
        throw new Error('Failed to update chat on server');
      }

    } catch (error) {
      logger.error('Edit Chat Error:', error);
      toast.error('Failed to update chat name', {
        description: 'Changes may not persist. Please try again.'
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return {
    handleStartNewChat,
    handleSelectChat,
    handleDeleteChat: deleteChat,
    handleEditChat,
    handleSendMessage: sendMessage,
    dispatch,
    inputRef
  };
};
