import { ChatSession, ChatMessage } from '@/types/store';

export interface ChatState {
  chats: ChatSession[];
  currentChatId: string | null;
  selectedModel: string;
  isLoading: boolean;
  credits: number | null;
}

export type ChatAction =
  | { type: 'SET_CHATS'; payload: ChatSession[] }
  | { type: 'SET_CURRENT_CHAT'; payload: string | null }
  | { type: 'SET_MODEL'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CREDITS'; payload: string }
  | { type: 'UPDATE_CHAT'; payload: { chatId: string; updates: Partial<ChatSession> } }
  | { type: 'ADD_MESSAGE'; payload: { chatId: string; message: ChatMessage } }
  | { type: 'DELETE_CHAT'; payload: string }
  | { type: 'REORDER_CHATS'; payload: string };
