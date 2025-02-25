import prisma from '@/lib/prismaClient';
import { ChatMessage } from '@/types/ai.types';

export class ChatService {
  static async findChat(chatId: string) {
    return prisma.chat.findUnique({
      where: { chat_id: chatId },
      include: {
        chat_history: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });
  }

  static async createUserMessage(chatId: string, userMessage: string) {
    return prisma.chatHistory.create({
      data: {
        chat_id: chatId,
        user_input: userMessage,
        timestamp: new Date(),
        input_type: 'text',
        output_type: 'text',
        context_id: chatId,
        credits_deducted: '0'
      }
    });
  }

  static async createAIMessage(chatId: string, aiResponse: string, model: string, creditsDeducted: string) {
    return prisma.chatHistory.create({
      data: {
        chat_id: chatId,
        api_response: aiResponse,
        timestamp: new Date(),
        input_type: 'text',
        output_type: 'text',
        context_id: chatId,
        model: model,
        credits_deducted: creditsDeducted
      }
    });
  }

  static async getPreviousMessages(chatId: string) {
    return prisma.chatHistory.findMany({
      where: { chat_id: chatId },
      orderBy: { timestamp: 'asc' }
    });
  }

  static async updateChatSummary(chatId: string, newSummary: string) {
    return prisma.chat.update({
      where: { chat_id: chatId },
      data: { chat_summary: newSummary }
    });
  }

  static async updateTimestamp(chatId: string) {
    return prisma.chat.update({
      where: { chat_id: chatId },
      data: { updated_at: new Date() }
    });
  }
}
