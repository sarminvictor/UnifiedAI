'use client';

import { ModelName } from '@/types/ai.types';

export interface ChatMessage {
  user_input: string;
  api_response: string;
  timestamp: string;
  model?: ModelName;
  credits_deducted?: string;
  inputType?: string;
  outputType?: string;
  contextId?: string;
  tokensUsed?: string;
}

export interface Chat {
  chat_id: string;
  chat_title?: string;
  chat_history: ChatMessage[];
  model?: ModelName;
  updated_at: string;
  isTemp?: boolean;
  brainstorm_mode?: boolean;
  brainstorm_settings?: any;
}

export interface ChatState {
  chats: Chat[];
  currentChatId: string | null;
  selectedModel: ModelName;
  isLoading: boolean;
  credits: number | null;
  dispatch: (action: ChatAction) => void;
}

export type ChatAction =
  | { type: 'SET_CHATS'; payload: Chat[] }
  | { type: 'SET_CHATS_PRESERVE_SELECTION'; payload: { chats: Chat[]; preserveId: string } }
  | { type: 'SET_CURRENT_CHAT'; payload: string | null }
  | { type: 'SET_MODEL'; payload: ModelName }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CREDITS'; payload: number }
  | { type: 'ADD_MESSAGE'; payload: { chatId: string; message: ChatMessage } }
  | { type: 'REORDER_CHATS'; payload: string }
  | { type: 'REPLACE_TEMP_CHAT'; payload: { tempId: string; realId: string; updates: Partial<Chat> } }
  | { type: 'UPDATE_CHAT'; payload: { chatId: string; updates: Partial<Chat> } }
  | { type: 'DELETE_CHAT'; payload: string };
