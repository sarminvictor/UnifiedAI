import prisma from '@/lib/prismaClient';
import { sanitizeString } from '@/utils/sanitize';
import { ModelName } from '@/types/ai.types';
import { CHAT_CONSTANTS } from '@/constants/ai.constants';

export class ChatService {
  static async findChat(chatId: string) {
    return prisma.chat.findUnique({
      where: { chat_id: chatId },
      select: { 
        deleted: true, 
        user_id: true,
        chat_summary: true
      }
    });
  }

  static async createUserMessage(chatId: string, userMessage: string) {
    return prisma.chatHistory.create({
      data: {
        chat: { connect: { chat_id: chatId } },
        user_input: sanitizeString(userMessage) || '',
        api_response: '',
        input_type: 'Text',
        output_type: 'Text',
        timestamp: new Date(),
        context_id: chatId,
        credits_deducted: '0',
      },
    });
  }

  static async createAIMessage(
    chatId: string, 
    response: string, 
    modelName: ModelName, 
    creditsDeducted: string
  ) {
    return prisma.chatHistory.create({
      data: {
        chat: { connect: { chat_id: chatId } },
        user_input: '',
        api_response: sanitizeString(response),
        input_type: 'Text',
        output_type: 'Text',
        timestamp: new Date(),
        context_id: chatId,
        model: modelName,
        credits_deducted: creditsDeducted,
      },
    });
  }

  static async getPreviousMessages(chatId: string, limit: number = CHAT_CONSTANTS.DEFAULT_MESSAGE_LIMIT) {
    return prisma.chatHistory.findMany({
      where: { chat_id: chatId },
      orderBy: { timestamp: 'asc' },
      take: limit
    });
  }

  static async updateChatSummary(chatId: string, summary: string) {
    return prisma.chat.update({
      where: { chat_id: chatId },
      data: { 
        chat_summary: summary,
        updated_at: new Date()
      }
    });
  }

  static async updateTimestamp(chatId: string) {
    return prisma.chat.update({
      where: { chat_id: chatId },
      data: { updated_at: new Date() }
    });
  }
}
