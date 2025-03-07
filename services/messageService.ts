import { ChatMessage } from '@/types/store';
import { logger } from '@/utils/logger';
import { chatService } from './chatService';
import { generateChatId } from '@/utils/chatUtils'; // Add this import
import { ModelName } from '@/types/ai.types';
import { DEFAULT_BRAINSTORM_SETTINGS } from '@/types/chat/settings';

export const messageService = {
  async sendMessage(
    chatId: string,
    messageText: string,
    model: ModelName,
    brainstormMode = false,
    brainstormSettings = DEFAULT_BRAINSTORM_SETTINGS
  ) {
    try {
      const isTemp = chatId.startsWith('temp_');
      let actualChatId = chatId;
      let replacementInfo = null;

      // Create a new chat ID if this is a temporary ID
      if (isTemp) {
        // Generate a real UUID for the chat
        const realChatId = generateChatId();
        actualChatId = realChatId;
        replacementInfo = { oldId: chatId, newId: actualChatId };

        // Emit event for immediate UI update
        window.dispatchEvent(new CustomEvent('replaceTempChat', {
          detail: replacementInfo
        }));

        logger.debug('Created real chat ID for temp chat:', {
          tempId: chatId,
          realId: actualChatId,
          model,
          brainstormMode,
          hasSettings: !!brainstormSettings
        });
      }

      // Ensure the model is included in the brainstorm settings
      // but preserve all other settings that may have been customized
      const updatedBrainstormSettings = {
        ...brainstormSettings,
        mainModel: model // Include the current model in settings
      };

      logger.debug('Brainstorm settings being saved:', {
        messagesLimit: updatedBrainstormSettings.messagesLimit,
        customPrompt: updatedBrainstormSettings.customPrompt?.substring(0, 50) + '...',
        summaryModel: updatedBrainstormSettings.summaryModel,
        additionalModel: updatedBrainstormSettings.additionalModel,
        mainModel: updatedBrainstormSettings.mainModel
      });

      // Save the user message - this will also create the chat if it doesn't exist
      logger.debug('Saving message to chat:', {
        chatId: actualChatId,
        isTemp,
        messageLength: messageText.length,
        model,
        brainstormMode,
        brainstormSettings: updatedBrainstormSettings
      });

      const messageResponse = await fetch('/api/chat/saveMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: actualChatId,
          message: {
            userInput: messageText,
            timestamp: new Date().toISOString(),
            model
          },
          // Include chat metadata for new chats
          chatMetadata: isTemp ? {
            chatTitle: 'New Chat',
            brainstorm_mode: brainstormMode,
            brainstorm_settings: updatedBrainstormSettings
          } : undefined
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
