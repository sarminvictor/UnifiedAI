import prisma from '@/lib/prismaClient';
import { APIUsageData, ModelName } from '@/types/ai.types';
import { ErrorHandler, ErrorCodes } from '@/utils/errorHandler';

export class APIUsageService {
  static async findAPIModel(modelName: ModelName) {
    return prisma.aPI.findUnique({ 
      where: { api_name: modelName },
      select: { api_id: true, pricing_per_token: true }
    });
  }

  static calculateAPICost(pricePerToken: string, totalTokens: string): string {
    return (parseFloat(pricePerToken) * parseInt(totalTokens)).toFixed(6);
  }

  static async logAPIUsage(data: APIUsageData) {
    const api = await this.findAPIModel(data.modelName);
    if (!api) {
      ErrorHandler.throwError('API model not found', 404, ErrorCodes.API_ERROR);
    }

    const apiCost = this.calculateAPICost(api.pricing_per_token, data.tokensUsed);

    return prisma.aPIUsageLog.create({
      data: {
        user: { connect: { id: data.userId } },
        chat: { connect: { chat_id: data.chatId } },
        apis: { connect: { api_id: api.api_id } },
        tokens_used: data.tokensUsed,
        prompt_tokens: data.promptTokens,
        completion_tokens: data.completionTokens,
        credits_deducted: data.creditsDeducted,
        api_cost: apiCost,
        usage_type: "AI",
        input_type: "Text",
        output_type: "Text",
        messages_used: data.messageIds,
      },
    });
  }
}
