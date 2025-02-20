import type { ChatMessage } from "@/types/store";
import type { ChatMessageProps } from '@/components/Chat/ChatContainer';
import { v4 as uuidv4 } from 'uuid';

export const convertChatMessage = (message: ChatMessage): ChatMessageProps => ({
  userInput: message.userInput,
  apiResponse: message.apiResponse,
  inputType: message.inputType,
  outputType: message.outputType,
  timestamp: message.timestamp,
  contextId: message.contextId,
  model: message.model,
  tokensUsed: message.tokensUsed ? parseInt(message.tokensUsed) : undefined,
  creditsDeducted: message.creditsDeducted
});

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
