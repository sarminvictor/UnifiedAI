'use client';

import type { ChatMessage } from "@/types/store";
import type { ChatMessageProps } from '@/components/Chat/ChatContainer';
import { v4 as uuidv4 } from 'uuid';

export function generateChatId(): string {
  return uuidv4();
}

export const convertChatMessage = (message: any) => {
  console.group('Message Conversion Details');
  console.log('Input Message:', message);
  console.log('Message Keys:', message ? Object.keys(message) : 'null');
  console.log('Has user_input:', message?.user_input);
  console.log('Has api_response:', message?.api_response);
  
  const converted = {
    userInput: message?.user_input || '',
    apiResponse: message?.api_response || '',
    inputType: message?.input_type || 'text',
    outputType: message?.output_type || 'text',
    timestamp: message?.timestamp || new Date().toISOString(),
    contextId: message?.context_id || message?.contextId || '',
    model: message?.model || '',
    creditsDeducted: message?.credits_deducted || '0'
  };

  console.log('Converted Message:', converted);
  console.log('Has Content:', {
    hasUserInput: !!converted.userInput,
    hasApiResponse: !!converted.apiResponse,
    userInputLength: converted.userInput.length,
    apiResponseLength: converted.apiResponse.length
  });
  console.groupEnd();
  
  return converted;
};

export const cleanupEmptyChats = (chats: any[], currentChatId: string | null) => {
  return chats.filter(chat => 
    chat.messages.length > 0 || chat.chat_id === currentChatId
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
