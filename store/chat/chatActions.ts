'use client';

import { useRef, useEffect } from 'react';
import { useChatStore } from './chatStore';
import { messageService } from '@/services/messageService';
import { chatService } from '@/services/chatService';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { generateChatId } from '@/utils/chatUtils';
import { toast } from 'sonner'; // Replace the old toast import with sonner
import { useSWRConfig } from 'swr';

export const useChatActions = () => {
  const dispatch = useChatStore(state => state.dispatch);
  const store = useChatStore();
  const inputRef = useRef<HTMLInputElement>(null);
  // Add tracking for replaced IDs
  const replacedChatIds = useRef<Map<string, string>>(new Map());

  // Listen for temp chat replacements from message service
  useEffect(() => {
    const handleReplaceTempChat = (event: CustomEvent) => {
      const { tempId, realId } = event.detail;
      if (tempId && realId) {
        // Track this replacement to avoid duplicates
        replacedChatIds.current.set(tempId, realId);

        dispatch({
          type: 'REPLACE_TEMP_CHAT',
          payload: {
            tempId,
            realId,
            updates: {}
          }
        });
      }
    };

    window.addEventListener('replaceTempChat', handleReplaceTempChat as EventListener);

    return () => {
      window.removeEventListener('replaceTempChat', handleReplaceTempChat as EventListener);
    };
  }, [dispatch]);

  const handleStartNewChat = () => {
    // Check for existing empty chat
    const emptyChat = store.chats.find(chat =>
      !chat.chat_history || chat.chat_history.length === 0
    );

    if (emptyChat) {
      dispatch({ type: 'SET_CURRENT_CHAT', payload: emptyChat.chat_id });
      dispatch({ type: 'SET_MODEL', payload: 'ChatGPT' });
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    // Create temporary chat without real ID
    const tempChat = {
      chat_id: `temp_${Date.now()}`, // Temporary ID for state management only
      chat_title: "New Chat",
      chat_history: [],
      model: "ChatGPT",
      updated_at: new Date().toISOString(),
      isTemp: true // Add flag to identify temporary chats
    };

    // Add to beginning of chat list
    dispatch({ type: 'SET_CHATS', payload: [tempChat, ...store.chats] });
    dispatch({ type: 'SET_CURRENT_CHAT', payload: tempChat.chat_id });
    dispatch({ type: 'SET_MODEL', payload: 'ChatGPT' });
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelectChat = async (chatId: string) => {
    if (!chatId) return;

    try {
      // Clean up empty chats before selecting new one
      const nonEmptyChats = store.chats.filter(chat =>
        chat.chat_history?.length > 0 || chat.chat_id === chatId
      );
      dispatch({ type: 'SET_CHATS', payload: nonEmptyChats });

      dispatch({ type: 'SET_CURRENT_CHAT', payload: chatId });
      const selectedChat = store.chats.find(chat => chat.chat_id === chatId);
      if (selectedChat) {
        dispatch({ type: 'SET_MODEL', payload: selectedChat.model || 'ChatGPT' });
      }
      setTimeout(() => inputRef.current?.focus(), 10);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to access chat';

      toast.error('Error accessing chat', {
        description: errorMessage
      });

      // Clear invalid chat from URL and state
      window?.history?.pushState({}, '', '/');
      dispatch({ type: 'SET_CURRENT_CHAT', payload: null });
    }
  };

  const sendMessage = async (messageText: string) => {
    // Credit check
    if (!store.credits || parseFloat(String(store.credits)) <= 0.05) {
      toast.error('Insufficient credits', {
        description: 'Please add more credits to continue.',
        action: {
          label: 'Add Credits',
          onClick: () => window.location.href = '/user/credits'
        }
      });
      return;
    }

    if (!messageText.trim()) {
      toast.error('Cannot send empty message');
      return;
    }

    if (!store.currentChatId) {
      toast.error('No active chat selected');
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const currentChatId = store.currentChatId;
      if (!currentChatId) throw new Error('No active chat');

      // Create optimistic user message
      const optimisticUserMessage = {
        user_input: messageText,
        api_response: '',
        timestamp: new Date().toISOString(),
        model: store.selectedModel,
      };

      // Optimistic update
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          chatId: currentChatId,
          message: optimisticUserMessage
        }
      });

      // Send message to API
      const response = await messageService.sendMessage(
        currentChatId,
        messageText.trim(),
        store.selectedModel
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to get AI response');
      }

      // Check if this was a temp chat that's been replaced
      let activeChatId = store.currentChatId;

      // Handle replacement only if not already handled by event
      if (response.replaced && !replacedChatIds.current.has(response.replaced.oldId)) {
        activeChatId = response.replaced.newId;
        dispatch({
          type: 'REPLACE_TEMP_CHAT',
          payload: {
            tempId: response.replaced.oldId,
            realId: response.replaced.newId,
            updates: {}
          }
        });
        // Clear the tracked replacement
        replacedChatIds.current.delete(response.replaced.oldId);
      }

      // Add AI response to the current (possibly updated) chat ID
      const aiMessage = {
        user_input: '',
        api_response: response.aiMessage?.api_response || '',
        timestamp: new Date().toISOString(),
        model: store.selectedModel,
        credits_deducted: response.creditsDeducted
      };

      // Use the most current chat ID for adding the message
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          chatId: activeChatId || currentChatId,
          message: aiMessage
        }
      });

      // Update credits and reorder
      if (response.credits_remaining !== undefined) {
        dispatch({ type: 'SET_CREDITS', payload: response.credits_remaining });
      }
      dispatch({ type: 'REORDER_CHATS', payload: activeChatId || currentChatId });

      // Refocus input after response
      setTimeout(() => inputRef.current?.focus(), 10);

    } catch (error: any) {
      logger.error('Send Message Error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Please try again';

      // Special handling for insufficient credits
      if (errorMessage.toLowerCase().includes('insufficient credits')) {
        toast.error('Insufficient credits', {
          description: 'Please add more credits to continue using the service.',
          action: {
            label: 'Add Credits',
            onClick: () => window.location.href = '/user/credits'
          },
          duration: 5000
        });
      } else {
        toast.error('Failed to send message', {
          description: errorMessage,
          duration: 5000
        });
      }

      // Add error message to chat
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          chatId: store.currentChatId,
          message: {
            user_input: '',
            api_response: `Error: ${errorMessage}`,
            timestamp: new Date().toISOString(),
            model: store.selectedModel
          }
        }
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      // Ensure focus even after error
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      // Check if deleting current chat
      const isCurrentChat = store.currentChatId === chatId;

      // Remove from UI immediately for better UX
      dispatch({ type: 'DELETE_CHAT', payload: chatId });

      // Reset current chat if needed
      if (isCurrentChat) {
        dispatch({ type: 'SET_CURRENT_CHAT', payload: null });
      }

      // Then try server deletion (for non-temp chats)
      if (!chatId.startsWith('temp_')) {
        const response = await chatService.deleteChat(chatId);

        if (!response.success) {
          throw new Error(response.message || 'Failed to delete chat on server');
        }
      }

      // Force refresh chat list
      await fetch('/api/chat/getChats').then(res => res.json());

    } catch (error) {
      logger.error('Delete Chat Error:', error);
      toast.error('Failed to delete chat', {
        description: 'Please try again later'
      });

      // Refresh chat list on error to ensure sync with server
      const refreshChats = useSWRConfig().mutate;
      refreshChats('/api/chat/getChats');
    }
  };

  const handleEditChat = async (chatId: string, newName: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Optimistically update the chat title and order
      dispatch({
        type: 'UPDATE_CHAT',
        payload: {
          chatId,
          updates: {
            chat_title: newName,
            updated_at: new Date().toISOString()
          }
        }
      });

      // Reorder immediately for better UX
      dispatch({ type: 'REORDER_CHATS', payload: chatId });

      // Then save to server
      const updatedChat = await chatService.updateChat(chatId, {
        chatTitle: newName
      });

      if (!updatedChat.success) {
        // If server update fails, show error but keep optimistic update
        throw new Error('Failed to update chat on server');
      }

    } catch (error) {
      logger.error('Edit Chat Error:', error);
      toast.error('Failed to update chat name', {
        description: 'Changes may not persist. Please try again.'
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return {
    handleStartNewChat,
    handleSelectChat,
    handleDeleteChat: deleteChat,
    handleEditChat,
    handleSendMessage: sendMessage,
    dispatch,
    inputRef
  };
};
