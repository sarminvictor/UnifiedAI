'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/store/chat/chatStore';
import { chatService } from '@/services/chatService';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';

export const useVisibilityEffect = () => {
  const { chats, currentChatId, dispatch } = useChatStore();

  useEffect(() => {
    const cleanupEmptyChats = () => {
      const nonEmptyChats = chats.filter(chat =>
        chat.isTemp || // Keep temporary chats
        chat.chat_id.startsWith('temp_') || // Keep chats with temporary IDs
        chat.chat_history?.length > 0 || // Keep chats with messages
        chat.chat_id === currentChatId // Keep the current chat
      );

      if (nonEmptyChats.length !== chats.length) {
        dispatch({ type: 'SET_CHATS', payload: nonEmptyChats });
      }
    };

    const syncWithBackend = async () => {
      if (!currentChatId) return;

      // Skip syncing for temporary chats
      if (currentChatId.startsWith('temp_')) {
        logger.debug('Skipping sync for temporary chat:', { chatId: currentChatId });
        return;
      }

      try {
        logger.debug('Syncing chat with backend on visibility change:', { chatId: currentChatId });

        // Fetch the latest chat data from the backend
        const chatData = await chatService.getChat(currentChatId);

        // Validate chat data
        if (!chatData) {
          logger.warn('No chat data returned from backend:', { chatId: currentChatId });
          return;
        }

        // Check for invalid chat data structure
        if (typeof chatData !== 'object') {
          logger.error('Invalid chat data structure:', {
            chatId: currentChatId,
            dataType: typeof chatData
          });
          return;
        }

        // Ensure chat_history exists to prevent "Cannot read properties of undefined (reading 'length')" error
        if (!chatData.chat_history) {
          logger.warn('Chat data is missing chat_history property:', { chatId: currentChatId });
          chatData.chat_history = [];
        }

        // Make sure chat_history is an array
        if (!Array.isArray(chatData.chat_history)) {
          logger.error('chat_history is not an array:', {
            chatId: currentChatId,
            historyType: typeof chatData.chat_history
          });
          chatData.chat_history = [];
        }

        // Update the chat in the store with the latest data from the backend
        dispatch({
          type: 'SYNC_CHAT',
          payload: {
            chatId: currentChatId,
            chatData
          }
        });

        logger.debug('Chat synced successfully:', { chatId: currentChatId });
      } catch (error) {
        logger.error('Failed to sync chat on visibility change:', {
          chatId: currentChatId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // For network errors, provide a visible notification
        if (error instanceof Error && error.message.includes('network')) {
          toast.error('Network error while syncing chat. Some messages may not be displayed.');
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        cleanupEmptyChats();
      } else if (document.visibilityState === 'visible') {
        // Sync with backend when tab becomes visible
        syncWithBackend();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [chats, currentChatId, dispatch]);
};
