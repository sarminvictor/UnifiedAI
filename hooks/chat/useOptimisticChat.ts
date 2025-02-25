'use client';

import type { ChatSession, ChatMessage } from '@/types/store';

export const useOptimisticChat = () => {
  const updateChatOrder = (
    chats: ChatSession[],
    chatId: string,
    message: ChatMessage
  ): ChatSession[] => {
    const updatedChats = [...chats];
    const chatIndex = updatedChats.findIndex(chat => chat.chat_id === chatId);
    
    if (chatIndex > -1) {
      const chat = updatedChats[chatIndex];
      updatedChats.splice(chatIndex, 1);
      updatedChats.unshift({
        ...chat,
        messages: [...chat.messages, message],
        updated_at: new Date().toISOString()
      });
    }
    
    return updatedChats;
  };

  const optimisticUpdate = (refreshChats: Function, updateFn: (chats: ChatSession[]) => ChatSession[]) => {
    refreshChats((prev: any) => ({
      ...prev,
      data: { 
        activeChats: updateFn(prev.data.activeChats || [])
      }
    }), false);
  };

  return {
    updateChatOrder,
    optimisticUpdate
  };
};
