import { logger } from '@/utils/logger';
import { chatService } from '@/services/chatService';
import { useOptimisticChat } from './useOptimisticChat';
import type { ChatState, ChatStateData, ChatSession } from '@/types/store';

export const useChatOperations = (state: ChatState) => {
  const { optimisticUpdate } = useOptimisticChat();

  const handleStartNewChat = () => {
    const { chatSessions, setCurrentChatId, setSelectedModel, inputRef, refreshChats } = state;
    
    const emptyChat = chatSessions.find(chat => chat.messages.length === 0);
    if (emptyChat) {
      setCurrentChatId(emptyChat.chat_id);
      setSelectedModel(emptyChat.model || "ChatGPT");
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    const newChat: ChatSession = {
      chat_id: Date.now().toString(),
      chat_title: "New Chat",
      messages: [],
      model: "ChatGPT",
      updated_at: new Date().toISOString(),
    };

    refreshChats((prev: ChatStateData) => ({
      activeChats: [newChat, ...prev.activeChats]
    }));

    setCurrentChatId(newChat.chat_id);
    setSelectedModel("ChatGPT");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelectChat = async (chatId: string) => {
    const { setCurrentChatId, setSelectedModel, inputRef, refreshChats } = state;

    try {
      const { data } = await chatService.getChat(chatId);
      
      optimisticUpdate(refreshChats, (chats) => 
        chats.map(chat => chat.chat_id === chatId ? data : chat)
      );

      setCurrentChatId(chatId);
      setSelectedModel(data.model || "ChatGPT");
      setTimeout(() => inputRef.current?.focus(), 10);
    } catch (error) {
      logger.error('Select Chat Error:', error);
    }
  };

  const handleEditChat = async (chatId: string, newName: string) => {
    const { refreshChats } = state;
    if (!newName.trim()) return;

    try {
      await chatService.updateChat(chatId, { chatTitle: newName });
      refreshChats((prev: ChatStateData) => ({
        activeChats: prev.activeChats.map((chat: ChatSession) =>
          chat.chat_id === chatId ? { ...chat, chat_title: newName } : chat
        )
      }));
    } catch (error) {
      logger.error('Edit Chat Error:', error);
      refreshChats((prev: ChatStateData) => prev);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    const { currentChatId, setCurrentChatId, refreshChats } = state;
    
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }

    try {
      await chatService.deleteChat(chatId);
      refreshChats((prev: ChatStateData) => ({
        activeChats: prev.activeChats.filter((chat: ChatSession) => chat.chat_id !== chatId)
      }));
    } catch (error) {
      logger.error('Delete Chat Error:', error);
      refreshChats((prev: ChatStateData) => prev);
    }
  };

  return {
    handleStartNewChat,
    handleSelectChat,
    handleEditChat,
    handleDeleteChat,
  };
};
