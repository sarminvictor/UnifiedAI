import { logger } from '@/utils/logger';

export const chatService = {
  async createChat(chatId: string, chatTitle: string) {
    try {
      const response = await fetch("/api/saveChat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          chatId, 
          chatTitle,
          initialSetup: true // Add flag for initial setup
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create chat');
      }

      return await response.json();
    } catch (error) {
      logger.error('Create Chat Error:', error);
      throw error;
    }
  },

  async deleteChat(chatId: string) {
    const response = await fetch(`/api/deleteChat?chatId=${chatId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error("Failed to delete chat");
    return response.json();
  },

  async getChat(chatId: string) {
    const response = await fetch(`/api/getChat?chatId=${chatId}`);
    if (!response.ok) throw new Error("Failed to fetch chat");
    return response.json();
  },

  async updateChat(chatId: string, data: any) {
    const response = await fetch("/api/saveChat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, ...data }),
    });
    if (!response.ok) throw new Error("Failed to update chat");
    return response.json();
  }
};
