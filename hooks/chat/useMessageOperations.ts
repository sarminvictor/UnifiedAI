'use client';

import { logger } from '@/utils/logger';
import { messageService } from '@/services/messageService';
import { chatService } from '@/services/chatService';
import type { ChatState, ChatSession, ChatStateData } from '@/types/store';
import { ModelName } from '@/types/ai.types';

export const useMessageOperations = (state: ChatState) => {
  const handleSendMessage = async (messageText: string) => {
    const {
      currentChatId,
      credits,
      chatSessions,
      selectedModel,
      setIsLoading,
      refreshChats,
      refreshCredits,
      inputRef
    } = state;

    if (!messageText.trim() || !credits || !currentChatId) return;

    const chatId = currentChatId;
    const userMessage = messageService.createUserMessage(messageText, chatId);

    setIsLoading(true);

    try {
      // Create chat if new
      if (!chatSessions.find(chat => chat.chat_id === chatId && chat.messages.length > 0)) {
        await chatService.createChat(chatId, "New Chat");
      }

      // Optimistic update with user message
      refreshChats((prev: ChatStateData) => ({
        ...prev,
        activeChats: prev.activeChats.map((chat: ChatSession) =>
          chat.chat_id === chatId
            ? {
              ...chat,
              messages: [...chat.messages, userMessage],
              updated_at: new Date().toISOString()
            }
            : chat
        ),
      }));

      // Send message and get AI response
      const response = await messageService.sendMessage(chatId, messageText, selectedModel as ModelName);

      if (!response.success) {
        throw new Error(response.message || "Failed to get AI response");
      }

      // Update with AI response
      const aiMessage = messageService.createAIMessage(response, chatId);

      refreshChats((prev: ChatStateData) => ({
        ...prev,
        activeChats: prev.activeChats.map((chat: ChatSession) =>
          chat.chat_id === chatId
            ? {
              ...chat,
              messages: [...chat.messages, aiMessage],
              updated_at: new Date().toISOString()
            }
            : chat
        ),
      }));
    } catch (error) {
      logger.error("Send Message Error:", error);
      refreshChats((prev: ChatStateData) => prev); // Revert optimistic update
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return { handleSendMessage };
};
