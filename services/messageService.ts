import { ChatMessage } from '@/types/store';
import { logger } from '@/utils/logger';

export const messageService = {
  async sendMessage(chatId: string, message: string, model: string) {
    try {
      const response = await fetch('/api/chatWithGPT', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          userMessage: message,
          modelName: model,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message');
      }

      return data;
    } catch (error: any) {
      // Clean error logging
      logger.error('Message Service Error:', {
        error: error.message,
        chatId,
        model,
        timestamp: new Date().toISOString()
      });
      throw new Error(error.message || 'Failed to send message');
    }
  },

  createUserMessage(text: string, chatId: string): ChatMessage {
    return {
      userInput: text,
      apiResponse: '',
      inputType: 'text',
      outputType: 'text',
      timestamp: new Date().toISOString(),
      contextId: chatId,
    };
  },

  createAIMessage(response: any, chatId: string): ChatMessage {
    return {
      userInput: '',
      apiResponse: response.aiMessage?.api_response || '',
      inputType: 'text',
      outputType: 'text',
      timestamp: new Date().toISOString(),
      contextId: chatId,
      model: response.model,
      tokensUsed: response.tokensUsed,
      creditsDeducted: response.creditsDeducted,
    };
  },
};
