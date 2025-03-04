import prisma from '@/lib/prismaClient';
import { ModelName } from '@/types/ai.types';
import { serverLogger } from '@/utils/serverLogger';
import { TOKEN_RATES, MODEL_PROVIDER_MAP, CREDIT_COST_PER_TOKEN } from '@/utils/ai.constants';

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
  private static calculateCreditsDeducted(modelName: ModelName, promptTokens: number, completionTokens: number): string {
    const modelRates = CREDIT_COST_PER_TOKEN[modelName];
    if (!modelRates) {
      throw new Error(`No credit rates found for model ${modelName}`);
    }

    const inputCredits = promptTokens * modelRates.inputCredits;
    const outputCredits = completionTokens * modelRates.outputCredits;
    const totalCredits = inputCredits + outputCredits;

    return totalCredits.toFixed(6);
  }

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
      // Get or create API entry
      let api = await prisma.aPI.findFirst({
        where: {
          llm_model: modelName
        }
      });

      if (!api) {
        // Get provider and pricing info
        const provider = MODEL_PROVIDER_MAP[modelName];
        const providerRates = TOKEN_RATES[provider];
        const modelRates = providerRates?.[modelName];

        if (!modelRates) {
          throw new Error(`No pricing configuration found for model ${modelName}`);
        }

        // Create new API entry with combined rate for backwards compatibility
        const combinedRate = ((modelRates.inputCostPer1kTokens + modelRates.outputCostPer1kTokens) / 2).toString();
        api = await prisma.aPI.create({
          data: {
            api_name: `${provider} ${modelName}`,
            pricing_per_token: combinedRate,
            input_output_type: 'Text',
            status: 'Active',
            llm_model: modelName
          }
        });

        serverLogger.info('Created new API entry:', { api });
      }

      // Calculate API cost for our tracking (USD)
      const provider = MODEL_PROVIDER_MAP[modelName];
      const providerRates = TOKEN_RATES[provider];
      const modelRates = providerRates?.[modelName];
      const apiCost = modelRates ? (
        (parseInt(promptTokens) * modelRates.inputCostPer1kTokens / 1000 +
          parseInt(completionTokens) * modelRates.outputCostPer1kTokens / 1000)
      ).toString() : '0';

      // Calculate credits deducted using our internal credit rates
      const calculatedCredits = this.calculateCreditsDeducted(
        modelName,
        parseInt(promptTokens),
        parseInt(completionTokens)
      );

      // Create API usage log
      const apiUsageLog = await prisma.aPIUsageLog.create({
        data: {
          user_id: userId,
          chat_id: chatId,
          api_id: api.api_id,
          tokens_used: tokensUsed,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          credits_deducted: calculatedCredits,
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
        promptTokens,
        completionTokens,
        creditsDeducted: calculatedCredits,
        apiCost
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
