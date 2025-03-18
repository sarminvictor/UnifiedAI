import { generateChatId } from '@/utils/chatUtils';
import { logger } from '@/utils/logger';
import { ModelName } from '@/types/ai.types';
import { DEFAULT_BRAINSTORM_SETTINGS } from '@/types/chat/settings';

export const chatService = {
  async deleteChat(chatId: string) {
    try {
      if (chatId.startsWith('temp_')) {
        // For temporary chats, we can just return success without API call
        return { success: true, data: { chatId } };
      }

      const response = await fetch('/api/chat/deleteChat', { // Remove /route
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ chatId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete chat');
      }

      return data;
    } catch (error) {
      logger.error('Delete Chat Error:', error);
      throw error;
    }
  },

  async getChat(chatId: string) {
    try {
      // Validate UUID format
      if (!chatId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        throw new Error('Invalid chat ID format');
      }

      const response = await fetch(`/api/chat/getChat?chatId=${chatId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch chat');
      }

      // Check for deleted status
      if (data.deleted) {
        throw new Error('Chat has been deleted');
      }

      return data;
    } catch (error) {
      logger.error('Get Chat Error:', error);
      throw error;
    }
  },

  async updateChat(chatId: string, data: any) {
    try {
      logger.debug('Updating chat with data:', {
        chatId,
        chat_title: data.chat_title,
        brainstorm_mode: data.brainstorm_mode,
        brainstorm_settings: {
          messagesLimit: data.brainstorm_settings?.messagesLimit,
          customPromptLength: data.brainstorm_settings?.customPrompt?.length,
          summaryModel: data.brainstorm_settings?.summaryModel,
          additionalModel: data.brainstorm_settings?.additionalModel,
          mainModel: data.brainstorm_settings?.mainModel
        }
      });

      const response = await fetch("/api/chat/saveChat", {  // Updated path
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, ...data }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update chat' }));
        throw new Error(errorData.message || 'Failed to update chat');
      }

      const result = await response.json();
      logger.debug('Chat updated successfully:', {
        chatId,
        success: result.success
      });

      return result;
    } catch (error) {
      logger.error('Update Chat Error:', error);
      throw error;
    }
  }
};
