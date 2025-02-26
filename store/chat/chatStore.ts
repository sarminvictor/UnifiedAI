'use client';

import { create } from 'zustand';
import { ChatState, ChatAction } from './types';

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  currentChatId: null,
  selectedModel: 'ChatGPT',
  isLoading: false,
  credits: null,
  dispatch: (action: ChatAction) => {
    console.group('Chat Store Action');
    console.log('Action:', action);
    console.log('Previous State:', get());

    switch (action.type) {
      case 'SET_CHATS': {
        // Filter out empty chats except for the current one
        const currentChatId = get().currentChatId;
        const filteredChats = action.payload.filter(chat =>
          chat.isTemp || chat.chat_history?.length > 0 || chat.chat_id === currentChatId
        );
        // Update URL when setting chats
        if (currentChatId && !currentChatId.startsWith('temp_')) {
          window?.history?.pushState({}, '', `/c/${currentChatId}`);
        }
        set({ chats: filteredChats });
        break;
      }
      case 'SET_CURRENT_CHAT': {
        // Update URL when changing chats
        if (action.payload && !action.payload.startsWith('temp_')) {
          window?.history?.pushState({}, '', `/c/${action.payload}`);
        } else {
          window?.history?.pushState({}, '', '/');
        }
        set({ currentChatId: action.payload });
        break;
      }
      case 'SET_MODEL':
        set({ selectedModel: action.payload });
        break;
      case 'SET_LOADING':
        set({ isLoading: action.payload });
        break;
      case 'SET_CREDITS':
        set({ credits: action.payload });
        break;
      case 'ADD_MESSAGE': {
        const { chatId, message } = action.payload;
        const chats = [...get().chats];
        const chatIndex = chats.findIndex(c => c.chat_id === chatId);

        if (chatIndex !== -1) {
          chats[chatIndex] = {
            ...chats[chatIndex],
            chat_history: [...(chats[chatIndex].chat_history || []), message],
            updated_at: new Date().toISOString()
          };
          set({ chats });
        }
        break;
      }
      case 'REORDER_CHATS': {
        const chatId = action.payload;
        const chats = [...get().chats];
        const chatIndex = chats.findIndex(c => c.chat_id === chatId);

        if (chatIndex !== -1) {
          const [chat] = chats.splice(chatIndex, 1);
          chats.unshift(chat);
          set({ chats });
        }
        break;
      }
      case 'UPDATE_CHAT': {
        const { chatId, updates } = action.payload;
        const chats = [...get().chats];
        const chatIndex = chats.findIndex(c => c.chat_id === chatId);

        if (chatIndex !== -1) {
          chats[chatIndex] = {
            ...chats[chatIndex],
            ...updates
          };
          set({ chats });
        }
        break;
      }
      case 'REPLACE_TEMP_CHAT': {
        const { tempId, realId, updates } = action.payload;
        const chats = [...get().chats];
        const chatIndex = chats.findIndex(c => c.chat_id === tempId);

        if (chatIndex !== -1) {
          chats[chatIndex] = {
            ...chats[chatIndex],
            chat_id: realId,
            isTemp: false, // Remove temp flag
            ...updates,
          };
          // Update URL when replacing temp chat
          window?.history?.pushState({}, '', `/c/${realId}`);
          set({
            chats,
            currentChatId: realId
          });
        }
        break;
      }
      case 'DELETE_CHAT': {
        const chatId = action.payload;
        const currentChatId = get().currentChatId;

        set(state => ({
          chats: state.chats.filter(chat => chat.chat_id !== chatId),
          currentChatId: currentChatId === chatId ? null : currentChatId
        }));

        // Clear URL if deleting current chat
        if (currentChatId === chatId) {
          window?.history?.pushState({}, '', '/');
        }
        break;
      }
      case 'SET_CHATS_PRESERVE_SELECTION': {
        const { chats, preserveId } = action.payload;
        const filteredChats = chats.filter(chat =>
          chat.isTemp || chat.chat_history?.length > 0 || chat.chat_id === preserveId
        );

        // Check if preserveId still exists in the new chat list
        const chatExists = filteredChats.some(chat => chat.chat_id === preserveId);

        set({
          chats: filteredChats,
          // Only keep the currentChatId if it exists in the new chat list
          currentChatId: chatExists ? preserveId : get().currentChatId
        });

        // Update URL only if needed and the chat exists
        if (preserveId && chatExists && !preserveId.startsWith('temp_')) {
          window?.history?.pushState({}, '', `/c/${preserveId}`);
        }
        break;
      }
    }

    console.log('New State:', get());
    console.groupEnd();
  }
}));

export type ChatDispatch = ChatState['dispatch'];
