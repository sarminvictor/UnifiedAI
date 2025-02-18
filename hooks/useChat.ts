import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatSession } from '@/utils/apiClient';

export const useChat = (chatSessions: ChatSession[]) => {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("ChatGPT");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleChatChange = useCallback((chatId: string | null) => {
    setCurrentChatId(chatId);
    if (chatId) {
      const chat = chatSessions.find(c => c.chat_id === chatId);
      if (chat) {
        setSelectedModel(chat.model || "ChatGPT");
      }
    }
  }, [chatSessions]);

  // Clean up effect for empty chats
  useEffect(() => {
    if (currentChatId) {
      const chatExists = chatSessions.some(chat => 
        chat.chat_id === currentChatId && (chat.messages.length > 0 || chatSessions.indexOf(chat) === 0)
      );
      
      if (!chatExists) {
        handleChatChange(null);
        inputRef.current?.blur();
      }
    }
  }, [chatSessions, currentChatId, handleChatChange]);

  return {
    currentChatId,
    setCurrentChatId: handleChatChange,
    selectedModel,
    setSelectedModel,
    inputRef
  };
};
