import type { ChatMessage } from "@/types/store";
import type { ChatMessageProps } from '@/components/Chat/ChatContainer';

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
