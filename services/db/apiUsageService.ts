import prisma from '@/lib/prismaClient';
import { ModelName } from '@/types/ai.types';
import { serverLogger } from '@/utils/serverLogger';

interface APIUsageLogParams {
  userId: string;
  chatId: string;
  modelName: ModelName;
  tokensUsed: string;
  promptTokens: string;
  completionTokens: string;
  creditsDeducted: string;
  messageIds: string[];
}

export class APIUsageService {
  static async logAPIUsage({
    userId,
    chatId,
    modelName,
    tokensUsed,
    promptTokens,
    completionTokens,
    creditsDeducted,
    messageIds
  }: APIUsageLogParams) {
    try {
      // Get API details
      const api = await prisma.aPI.findFirst({
        where: {
          llm_model: modelName
        }
      });

      if (!api) {
        serverLogger.error('API not found for model:', modelName);
        throw new Error(`API configuration not found for model ${modelName}`);
      }

      // Calculate API cost
      const tokenCost = parseFloat(api.pricing_per_token);
      const totalTokens = parseInt(tokensUsed);
      const apiCost = (tokenCost * totalTokens).toString();

      // Create API usage log
      const apiUsageLog = await prisma.aPIUsageLog.create({
        data: {
          user_id: userId,
          chat_id: chatId,
          api_id: api.api_id,
          tokens_used: tokensUsed,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          credits_deducted: creditsDeducted,
          api_cost: apiCost,
          usage_type: 'Chat',
          input_type: 'Text',
          output_type: 'Text',
          messages_used: messageIds
        }
      });

      serverLogger.info('API usage logged successfully:', {
        logId: apiUsageLog.log_id,
        model: modelName,
        tokensUsed,
        creditsDeducted
      });

      return apiUsageLog;
    } catch (error) {
      serverLogger.error('Error logging API usage:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        modelName,
        chatId
      });
      throw error;
    }
  }
}
