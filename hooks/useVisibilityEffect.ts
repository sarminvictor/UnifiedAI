import { useEffect } from 'react';
import { useChatStore } from '@/store/chat/chatStore';

export const useVisibilityEffect = () => {
  const { currentChatId, dispatch, chats } = useChatStore();

  useEffect(() => {
    const cleanupEmptyChats = () => {
      const nonEmptyChats = chats.filter(chat => 
        chat.messages.length > 0 || chat.chat_id === currentChatId
      );
      
      if (nonEmptyChats.length !== chats.length) {
        dispatch({ type: 'SET_CHATS', payload: nonEmptyChats });
      }
    };

    // Clean up on mount
    cleanupEmptyChats();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        cleanupEmptyChats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentChatId, chats, dispatch]);
};
