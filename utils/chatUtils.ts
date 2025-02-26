'use client';

import type { BaseMessage, ChatMessage } from "@/types/store";
import { v4 as uuidv4 } from 'uuid';

export function generateChatId(): string {
  return uuidv4();
}

interface RawChatMessage {
  user_input?: string;
  api_response?: string;
  input_type?: string;
  output_type?: string;
  timestamp?: string;
  context_id?: string;
  contextId?: string;
  model?: string;
  credits_deducted?: string;
}

export const convertChatMessage = (message: RawChatMessage | null): ChatMessage => {
  if (!message) {
    throw new Error('Message cannot be null or undefined');
  }

  const converted: ChatMessage = {
    messageId: uuidv4(),
    userInput: message.user_input || '',
    apiResponse: message.api_response || '',
    inputType: message.input_type || 'text',
    outputType: message.output_type || 'text',
    timestamp: message.timestamp || new Date().toISOString(),
    contextId: message.context_id || message.contextId || '',
    model: message.model || '',
    creditsDeducted: message.credits_deducted || '0',
    chat_id: null
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('Converted Message:', converted);
  }

  return converted;
};

export const cleanupEmptyChats = (chats: ChatMessage[], currentChatId: string | null): ChatMessage[] => {
  if (!Array.isArray(chats)) {
    throw new Error('Chats must be an array');
  }
  return chats.filter(chat =>
    chat.messageId?.length > 0 || chat.chat_id === currentChatId
  );
};

export const getChatUrl = (chatId: string) => `/c/${chatId}`;

export const updateBrowserUrl = (chatId: string | null) => {
  if (chatId) {
    window.history.pushState({}, '', getChatUrl(chatId));
  } else {
    // Ensure we remove any chat ID from URL
    window.history.pushState({}, '', '/');
  }
};
