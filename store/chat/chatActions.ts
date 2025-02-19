import { useRef } from 'react';
import { useChatStore } from './chatStore';
import { messageService } from '@/services/messageService';
import { chatService } from '@/services/chatService';
import { logger } from '@/utils/logger';

export const useChatActions = () => {
  const dispatch = useChatStore(state => state.dispatch);
  const store = useChatStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartNewChat = () => {
    // Check for existing empty chat
    const emptyChat = store.chats.find(chat => chat.messages.length === 0);
    if (emptyChat) {
      dispatch({ type: 'SET_CURRENT_CHAT', payload: emptyChat.chat_id });
      dispatch({ type: 'SET_MODEL', payload: emptyChat.model || 'ChatGPT' });
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    // Create new chat only if no empty chat exists
    const newChatId = Date.now().toString();
    const newChat = {
      chat_id: newChatId,
      chat_title: "New Chat",
      messages: [],
      model: "ChatGPT",
      updated_at: new Date().toISOString(),
    };

    dispatch({ type: 'SET_CHATS', payload: [newChat, ...store.chats] });
    dispatch({ type: 'SET_CURRENT_CHAT', payload: newChatId });
    dispatch({ type: 'SET_MODEL', payload: 'ChatGPT' });
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelectChat = async (chatId: string) => {
    if (!chatId) return;
    
    // Clean up empty chats before selecting new one
    const nonEmptyChats = store.chats.filter(chat => 
      chat.messages.length > 0 || chat.chat_id === chatId
    );
    dispatch({ type: 'SET_CHATS', payload: nonEmptyChats });
    
    dispatch({ type: 'SET_CURRENT_CHAT', payload: chatId });
    const selectedChat = store.chats.find(chat => chat.chat_id === chatId);
    if (selectedChat) {
      dispatch({ type: 'SET_MODEL', payload: selectedChat.model || 'ChatGPT' });
    }
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || !store.credits || !store.currentChatId) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Ensure chat exists in database first
      const isNewChat = !store.chats.find(chat => 
        chat.chat_id === store.currentChatId && chat.messages.length > 0
      );
      
      if (isNewChat) {
        await chatService.createChat(store.currentChatId, "New Chat");
      }

      // Add user message optimistically
      const userMessage = messageService.createUserMessage(messageText, store.currentChatId);
      dispatch({ 
        type: 'ADD_MESSAGE', 
        payload: { chatId: store.currentChatId, message: userMessage } 
      });

      // Send message
      const response = await messageService.sendMessage(
        store.currentChatId,
        messageText.trim(),
        store.selectedModel
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to get AI response');
      }

      // Update credits immediately
      if (response.credits_remaining !== undefined) {
        dispatch({ type: 'SET_CREDITS', payload: response.credits_remaining });
      }

      // Add AI response
      const aiMessage = messageService.createAIMessage(response, store.currentChatId);
      dispatch({ 
        type: 'ADD_MESSAGE', 
        payload: { chatId: store.currentChatId, message: aiMessage } 
      });
      dispatch({ type: 'REORDER_CHATS', payload: store.currentChatId });

      // Refocus input after response
      setTimeout(() => inputRef.current?.focus(), 10);

    } catch (error: any) {
      logger.error('Send Message Error:', error);
      // Add error message to chat
      const errorMessage = messageService.createUserMessage(
        `Error: ${error.message || 'Failed to send message'}`,
        store.currentChatId
      );
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { chatId: store.currentChatId, message: { ...errorMessage, outputType: 'error' } }
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      // Ensure focus even after error
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      await chatService.deleteChat(chatId);
      dispatch({ type: 'DELETE_CHAT', payload: chatId });
    } catch (error) {
      logger.error('Delete Chat Error:', error);
    }
  };

  // Add other actions as needed...

  return {
    handleStartNewChat,
    handleSelectChat,
    handleDeleteChat: deleteChat,
    handleEditChat: async (chatId: string, newName: string) => {
      try {
        await chatService.updateChat(chatId, { chatTitle: newName });
        
        // Update chat title
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
        
        // Reorder after renaming
        dispatch({ type: 'REORDER_CHATS', payload: chatId });
      } catch (error) {
        logger.error('Edit Chat Error:', error);
      }
    },
    handleSendMessage: sendMessage,
    dispatch,
    inputRef
  };
};
