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

// New interface for streaming messages
export interface StreamingMessage {
  id: string;
  chatId: string;
  text: string;
  model?: ModelName;
  isComplete: boolean;
  startTime: Date;
  completeTime?: Date;
  sequence: number;
  credits?: string;
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
  // New property for streaming messages
  streamingMessages: {
    [chatId: string]: {
      [messageId: string]: StreamingMessage;
    }
  };
  // Message visibility state
  messageVisibility: {
    [messageId: string]: boolean;
  };
  dispatch: (action: ChatAction) => void;
}

export type ChatAction =
  | { type: 'SET_CHATS'; payload: Chat[] }
  | { type: 'SET_CHATS_PRESERVE_SELECTION'; payload: { chats: Chat[]; preserveId: string } }
  | { type: 'SET_CURRENT_CHAT'; payload: string | null }
  | { type: 'SET_MODEL'; payload: ModelName }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CREDITS'; payload: number | string }
  | { type: 'DEDUCT_CREDITS'; payload: number | string }
  | { type: 'ADD_MESSAGE'; payload: { chatId: string; message: ChatMessage } }
  | { type: 'REORDER_CHATS'; payload: string }
  | { type: 'REPLACE_TEMP_CHAT'; payload: { tempId: string; realId: string; updates: Partial<Chat> } }
  | { type: 'UPDATE_CHAT'; payload: { chatId: string; updates: Partial<Chat> } }
  | { type: 'DELETE_CHAT'; payload: string }
  // New action types for streaming
  | { type: 'START_STREAMING_MESSAGE'; payload: { chatId: string; messageId: string; model: ModelName } }
  | { type: 'UPDATE_STREAMING_MESSAGE'; payload: { chatId: string; messageId: string; token: string; sequence: number } }
  | { type: 'COMPLETE_STREAMING_MESSAGE'; payload: { chatId: string; messageId: string; finalText?: string; credits?: string } }
  | { type: 'REMOVE_STREAMING_MESSAGE'; payload: { chatId: string; messageId: string } }
  | { type: 'CLEAR_STREAMING_MESSAGES'; payload: { chatId: string } }
  | { type: 'SET_MESSAGE_VISIBILITY'; payload: { messageId: string; isVisible: boolean } }
  | { type: 'SYNC_CHAT'; payload: { chatId: string; chatData: Chat } };
