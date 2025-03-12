'use client';

import { logger } from '@/utils/logger';
import { messageService } from '@/services/messageService';
import { chatService } from '@/services/chatService';
import { useOptimisticChat } from './useOptimisticChat';
import type { ChatState } from '@/types/store';
import { useEffect } from 'react';
import { useChatSettings } from './useChatSettings';
import { ModelName } from '@/types/ai.types';

export const useChatMessages = (state: ChatState) => {
  const { updateChatOrder, optimisticUpdate } = useOptimisticChat();
  const { settings } = useChatSettings();

  // Listen for chat data refresh events
  useEffect(() => {
    const handleChatDataRefreshed = (event: CustomEvent) => {
      const { chatId, data } = event.detail;

      if (chatId === state.currentChatId && data) {
        logger.debug('Chat data refreshed event received:', { chatId });
        state.refreshChats((prev) => {
          // Find and update the refreshed chat
          const updatedChats = prev.activeChats.map(chat =>
            chat.chat_id === chatId ? data : chat
          );

          return {
            ...prev,
            activeChats: updatedChats
          };
        });
      }
    };

    const handleChatsListRefreshed = (event: CustomEvent) => {
      const { chats } = event.detail;

      if (chats) {
        logger.debug('Chats list refreshed event received');
        state.refreshChats(() => ({
          activeChats: chats
        }));
      }
    };

    // Add event listeners
    window.addEventListener('chatDataRefreshed', handleChatDataRefreshed as EventListener);
    window.addEventListener('chatsListRefreshed', handleChatsListRefreshed as EventListener);

    // Clean up
    return () => {
      window.removeEventListener('chatDataRefreshed', handleChatDataRefreshed as EventListener);
      window.removeEventListener('chatsListRefreshed', handleChatsListRefreshed as EventListener);
    };
  }, [state.currentChatId, state.refreshChats]);

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
        // Update chat title if it's a new chat
        await chatService.updateChat(currentChatId, { chat_title: "New Chat" });
      }

      // Get brainstorm settings
      const isBrainstormMode = settings?.brainstormMode || false;
      const brainstormSettings = settings?.brainstormSettings;

      // User message optimistic update
      const userMessage = messageService.createUserMessage(messageText, currentChatId, isBrainstormMode);
      optimisticUpdate(refreshChats, (chats) =>
        updateChatOrder(chats, currentChatId, userMessage)
      );

      // Send message with brainstorm settings if enabled
      const response = await messageService.sendMessage(
        currentChatId,
        messageText.trim(),
        selectedModel as ModelName,
        isBrainstormMode,
        brainstormSettings
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
