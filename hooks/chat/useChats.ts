'use client';

import useSWR from 'swr';
import { useChatStore } from '@/store/chat/chatStore';
import { logger } from '@/utils/logger';

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
        const serverChats = data.data.activeChats;
        
        // Find any temporary chats that need to be preserved
        const tempChats = currentChats.filter(chat => 
          chat.isTemp === true || (chat.chat_id && chat.chat_id.startsWith('temp_'))
        );
        
        // Check if our currentChatId is a temporary ID
        const isCurrentChatTemp = currentChatId && currentChatId.startsWith('temp_');
        
        // Either keep temp chats separate or try to match them with real chats
        const mergedChats = [
          ...tempChats,
          ...serverChats.filter(serverChat => 
            // Don't include server chats that might conflict with temp chats
            !tempChats.some(tempChat => tempChat.chat_title === serverChat.chat_title)
          )
        ];
        
        dispatch({ 
          type: 'SET_CHATS_PRESERVE_SELECTION', 
          payload: {
            chats: mergedChats,
            preserveId: currentChatId
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
