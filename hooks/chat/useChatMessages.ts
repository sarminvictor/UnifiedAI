'use client';

import { logger } from '@/utils/logger';
import { messageService } from '@/services/messageService';
import { chatService } from '@/services/chatService';
import { useOptimisticChat } from './useOptimisticChat';
import type { ChatState } from '@/types/store';

export const useChatMessages = (state: ChatState) => {
  const { updateChatOrder, optimisticUpdate } = useOptimisticChat();

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

    setIsLoading(true);

    try {
      // Create chat if new
      const isNewChat = !chatSessions.find(chat =>
        chat.chat_id === currentChatId && chat.messages.length > 0
      );

      if (isNewChat) {
        await chatService.createChat(currentChatId, "New Chat");
      }

      // User message optimistic update
      const userMessage = messageService.createUserMessage(messageText, currentChatId);
      optimisticUpdate(refreshChats, (chats) =>
        updateChatOrder(chats, currentChatId, userMessage)
      );

      // Send message
      const response = await messageService.sendMessage(
        currentChatId,
        messageText.trim(),
        selectedModel
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to get AI response");
      }

      // AI message update
      const aiMessage = messageService.createAIMessage(response, currentChatId);
      optimisticUpdate(refreshChats, (chats) =>
        updateChatOrder(chats, currentChatId, aiMessage)
      );

      refreshCredits();
    } catch (error) {
      logger.error("Send Message Error:", error);
      refreshChats((prev) => prev);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return { handleSendMessage };
};
