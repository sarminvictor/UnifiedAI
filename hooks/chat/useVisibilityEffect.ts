'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/store/chat/chatStore';

export const useVisibilityEffect = () => {
  const { chats, currentChatId, dispatch } = useChatStore();

  useEffect(() => {
    const cleanupEmptyChats = () => {
      const nonEmptyChats = chats.filter(chat => 
        chat.chat_history?.length > 0 || chat.chat_id === currentChatId
      );
      
      if (nonEmptyChats.length !== chats.length) {
        dispatch({ type: 'SET_CHATS', payload: nonEmptyChats });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        cleanupEmptyChats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [chats, currentChatId, dispatch]);
};
