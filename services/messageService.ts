import { ChatMessage } from '@/types/store';
import { logger } from '@/utils/logger';
import { chatService } from './chatService';
import { generateChatId } from '@/utils/chatUtils'; // Add this import

export const messageService = {
  async sendMessage(chatId: string, messageText: string, model: string) {
    try {
      const isTemp = chatId.startsWith('temp_');
      let actualChatId = chatId;
      let chatResponse;
      let replacementInfo = null;

      // Create a new chat if this is a temporary ID
      if (isTemp) {
        // Generate a real UUID for the chat
        const realChatId = generateChatId();

        try {
          // Create the chat in the database
          chatResponse = await fetch('/api/chat/saveChat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: realChatId,
              chatTitle: 'New Chat',
              initialSetup: true
            }),
          });

          if (!chatResponse.ok) {
            throw new Error('Failed to create chat');
          }

          const chatData = await chatResponse.json();
          if (!chatData.success) {
            throw new Error(chatData.message || 'Failed to create chat');
          }

          actualChatId = chatData.data.chat_id;
          replacementInfo = { oldId: chatId, newId: actualChatId };

          // Emit event for immediate UI update
          window.dispatchEvent(new CustomEvent('replaceTempChat', {
            detail: replacementInfo
          }));
        } catch (createError) {
          logger.error('Failed to create chat:', createError);
          // Fall back to using temp ID - will be rejected by API but at least we'll have error handling
          actualChatId = chatId;
        }
      }

      // Save the user message
      const messageResponse = await fetch('/api/chat/saveMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: actualChatId,
          message: {
            userInput: messageText,
            timestamp: new Date().toISOString(),
            model
          }
        })
      });

      if (!messageResponse.ok) {
        throw new Error('Failed to save message');
      }

      // Process with AI
      const aiResponse = await fetch('/api/chat/chatWithGPT', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: actualChatId,
          message: messageText,
          modelName: model
        }),
      });

      // Handle error responses properly
      if (!aiResponse.ok) {
        const errorData = await aiResponse.json();
        if (aiResponse.status === 403) {
          throw new Error('Insufficient credits');
        }
        throw new Error(errorData.message || `Error ${aiResponse.status}: ${aiResponse.statusText}`);
      }

      const aiData = await aiResponse.json();
      if (!aiData.success) {
        throw new Error(aiData.message || 'AI processing failed');
      }

      // Return all necessary data
      return {
        ...aiData,
        chatId: actualChatId,
        replaced: replacementInfo
      };
    } catch (error) {
      logger.error('Message Service Error:', error);
      throw error;
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
      chat_id: chatId,
      messageId: crypto.randomUUID(),
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
      chat_id: chatId,
      messageId: crypto.randomUUID(),
      model: response.model,
      tokensUsed: response.tokensUsed,
      creditsDeducted: response.creditsDeducted,
    };
  },
};
