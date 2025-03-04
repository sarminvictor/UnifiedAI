import { generateChatId } from '@/utils/chatUtils';
import { logger } from '@/utils/logger';

export const chatService = {
  async createChat(chatId: string, chatTitle: string = "New Chat") {
    try {
      // Don't create chat immediately, wait for first message
      return {
        success: true,
        data: {
          chat_id: chatId,
          chat_title: chatTitle,
          chat_history: [],
          model: 'ChatGPT',
          updated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Create Chat Error:', error);
      throw error;
    }
  },

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
    const response = await fetch("/api/chat/saveChat", {  // Updated path
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, ...data }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update chat' }));
      throw new Error(errorData.message || 'Failed to update chat');
    }

    return response.json();
  }
};
