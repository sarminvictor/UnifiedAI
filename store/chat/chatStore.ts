import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ChatState, ChatAction } from './types';
import type { ChatSession } from '@/types/store';

const initialState: ChatState = {
  chats: [],
  currentChatId: null,
  selectedModel: 'ChatGPT',
  isLoading: false,
  credits: null,
};

type ChatStore = ChatState & {
  dispatch: (action: ChatAction) => void;
};

export const useChatStore = create<ChatStore>()(
  devtools((set) => ({
    ...initialState,

    dispatch: (action: ChatAction) => {
      switch (action.type) {
        case 'SET_CHATS':
          // Validate data before setting
          if (Array.isArray(action.payload)) {
            set({
              chats: action.payload,
              currentChatId: action.payload.length > 0 
                ? action.payload[0].chat_id 
                : null
            });
          }
          break;

        case 'SET_CURRENT_CHAT':
          set({ currentChatId: action.payload });
          break;

        case 'SET_MODEL':
          set({ selectedModel: action.payload });
          break;

        case 'SET_LOADING':
          set({ isLoading: action.payload });
          break;

        case 'SET_CREDITS':
          set({ credits: action.payload ? Number(action.payload) : 0 });
          break;

        case 'UPDATE_CHAT': {
          const { chatId, updates } = action.payload;
          set((state: ChatState) => ({
            chats: state.chats.map((chat: ChatSession) =>
              chat.chat_id === chatId ? { ...chat, ...updates } : chat
            )
          }));
          break;
        }

        case 'ADD_MESSAGE': {
          const { chatId, message } = action.payload;
          set((state: ChatState) => ({
            chats: state.chats.map((chat: ChatSession) =>
              chat.chat_id === chatId
                ? {
                    ...chat,
                    messages: [...chat.messages, message],
                    updated_at: new Date().toISOString()
                  }
                : chat
            )
          }));
          break;
        }

        case 'DELETE_CHAT':
          set(state => ({
            chats: state.chats.filter(chat => chat.chat_id !== action.payload),
            currentChatId: state.currentChatId === action.payload ? null : state.currentChatId
          }));
          break;

        case 'REORDER_CHATS': {
          const chatId = action.payload;
          set(state => {
            const chats = [...state.chats];
            const chatIndex = chats.findIndex(chat => chat.chat_id === chatId);
            if (chatIndex > -1) {
              const [chat] = chats.splice(chatIndex, 1);
              chats.unshift(chat);
            }
            return { chats };
          });
          break;
        }
      }
    }
  }))
);
