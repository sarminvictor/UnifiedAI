'use client';

import useSWR from 'swr';
import { useChatStore } from '@/store/chat/chatStore';
import { logger } from '@/utils/logger';
import { Chat } from '@/store/chat/types';

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    headers: { 'Cache-Control': 'no-cache' }
  });
  if (!res.ok) throw new Error('Failed to fetch chats');
  return res.json();
};

export const useChats = () => {
  const dispatch = useChatStore(state => state.dispatch);
  const currentChatId = useChatStore(state => state.currentChatId);
  const currentChats = useChatStore(state => state.chats);

  const { data, error, mutate } = useSWR('/api/chat/getChats', fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    errorRetryCount: 3,
    dedupingInterval: 5000,
    onSuccess: (data) => {
      if (data.success) {
        const serverChats = data.data.activeChats as Chat[];

        // Find any temporary chats that need to be preserved
        const tempChats = currentChats.filter(chat =>
          chat.isTemp === true || (chat.chat_id && chat.chat_id.startsWith('temp_'))
        );

        // Check if our currentChatId is a temporary ID
        const isCurrentChatTemp = currentChatId && currentChatId.startsWith('temp_');

        // Log the state for debugging
        logger.debug('Merging chats from server:', {
          serverChatsCount: serverChats.length,
          tempChatsCount: tempChats.length,
          currentChatId,
          isCurrentChatTemp
        });

        // Either keep temp chats separate or try to match them with real chats
        const mergedChats = [
          ...tempChats,
          ...serverChats.filter((serverChat: Chat) =>
            // Don't include server chats that might conflict with temp chats
            !tempChats.some(tempChat => tempChat.chat_title === serverChat.chat_title)
          )
        ];

        // Ensure the current chat is included if it's temporary
        if (isCurrentChatTemp && currentChatId) {
          const currentTempChat = currentChats.find(chat => chat.chat_id === currentChatId);
          if (currentTempChat && !mergedChats.some(chat => chat.chat_id === currentChatId)) {
            logger.debug('Adding current temporary chat to merged chats:', { chatId: currentChatId });
            mergedChats.unshift(currentTempChat);
          }
        }

        // Sort chats by updated_at timestamp, newest first
        mergedChats.sort((a, b) => {
          const dateA = new Date(a.updated_at).getTime();
          const dateB = new Date(b.updated_at).getTime();
          return dateB - dateA; // Descending order (newest first)
        });

        dispatch({
          type: 'SET_CHATS_PRESERVE_SELECTION',
          payload: {
            chats: mergedChats,
            preserveId: currentChatId || ''
          }
        });
      }
    }
  });

  return {
    isLoading: !error && !data,
    error,
    mutate
  };
};
