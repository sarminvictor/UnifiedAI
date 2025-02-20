import { create } from 'zustand';
import { devtools } from 'zustand/middleware'; // Remove persist middleware
import { updateBrowserUrl } from '@/utils/chatUtils';
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
  devtools((set, get) => ({
    ...initialState,

    dispatch: (action: ChatAction) => {
      switch (action.type) {
        case 'SET_CHATS':
          if (Array.isArray(action.payload)) {
            const currentId = get().currentChatId; // Get current ID from state
            set({ 
              chats: action.payload,
              currentChatId: currentId && action.payload.some(c => c.chat_id === currentId) 
                ? currentId 
                : null
            });
            
            // Check URL for chat ID on initial load if no current chat
            if (!currentId) {
              const path = window?.location?.pathname;
              const urlChatId = path?.split('/c/')?.[1];
              if (urlChatId && action.payload.some(c => c.chat_id === urlChatId)) {
                set({ currentChatId: urlChatId });
              }
            }
          }
          break;

        case 'SET_CURRENT_CHAT':
          if (action.payload) {
            const chat = get().chats.find(c => c.chat_id === action.payload);
            if (chat) {
              set({ currentChatId: action.payload });
              // Only update URL for chats with messages
              if (chat.messages?.length > 0) {
                updateBrowserUrl(action.payload);
              }
            }
          } else {
            set({ currentChatId: null });
            updateBrowserUrl(null);
          }
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
          set((state: ChatState) => {
            const updatedChats = state.chats.map((chat: ChatSession) =>
              chat.chat_id === chatId
                ? {
                    ...chat,
                    messages: [...chat.messages, message],
                    updated_at: new Date().toISOString()
                  }
                : chat
            );
            
            // Update URL after first message is added
            const updatedChat = updatedChats.find(c => c.chat_id === chatId);
            if (updatedChat?.messages.length === 1) {
              updateBrowserUrl(chatId);
            }
            
            return { chats: updatedChats };
          });
          break;
        }

        case 'DELETE_CHAT':
          set(state => {
            const newState = {
              chats: state.chats.filter(chat => chat.chat_id !== action.payload),
              currentChatId: state.currentChatId === action.payload ? null : state.currentChatId
            };
            // Clear URL when chat is deleted
            if (state.currentChatId === action.payload) {
              updateBrowserUrl(null);
            }
            return newState;
          });
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
