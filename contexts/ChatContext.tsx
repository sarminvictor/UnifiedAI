import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import type { ChatSession } from '@/utils/apiClient';

interface ChatContextType {
  currentChatId: string | null;
  setCurrentChatId: (chatId: string | null) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  handleChatChange: (chatId: string | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("ChatGPT");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleChatChange = useCallback((chatId: string | null) => {
    setCurrentChatId(chatId);
    if (!chatId && inputRef.current) {
      inputRef.current.blur();
    }
  }, []);

  return (
    <ChatContext.Provider value={{
      currentChatId,
      setCurrentChatId: handleChatChange,
      selectedModel,
      setSelectedModel,
      inputRef,
      handleChatChange,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
