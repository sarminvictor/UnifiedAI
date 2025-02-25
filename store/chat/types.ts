'use client';

export interface ChatState {
  chats: Array<{
    chat_id: string;
    chat_title?: string;
    chat_history: Array<{  // Keep chat_history instead of messages
      user_input?: string;
      api_response?: string;
      timestamp: string;
      model?: string;
      credits_deducted?: string;
    }>;
    model?: string;
    updated_at: string;
    isTemp?: boolean; // Add flag for temporary chats
  }>;
  currentChatId: string | null;
  selectedModel: string;
  isLoading: boolean;
  credits: number | null;
  dispatch: (action: ChatAction) => void;
}

export type ChatAction = 
  | { type: 'SET_CHATS'; payload: any[] }
  | { type: 'SET_CHATS_PRESERVE_SELECTION'; payload: { chats: any[], preserveId: string | null } }
  | { type: 'SET_CURRENT_CHAT'; payload: string | null }
  | { type: 'SET_MODEL'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CREDITS'; payload: number | null }
  | { type: 'ADD_MESSAGE'; payload: { chatId: string; message: any } }
  | { type: 'REORDER_CHATS'; payload: string }
  | { type: 'REPLACE_TEMP_CHAT'; payload: { 
      tempId: string; 
      realId: string; 
      updates?: {
        chat_title?: string;
        model?: string;
      }
    } 
  };
