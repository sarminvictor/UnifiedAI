import { TOKEN_RATES, CHAT_CONSTANTS, MODEL_PROVIDER_MAP, CREDIT_COST_PER_TOKEN } from '@/utils/ai.constants';
import { TokenInfo, ModelName, AIProvider } from '@/types/ai.types';

export class TokenCalculator {
  public static calculateTokens(text: string): number {
    return Math.ceil(text.length / CHAT_CONSTANTS.TOKENS_PER_CHAR);
  }

  public static calculateCredits(model: ModelName, promptTokens: number, completionTokens: number): string {
    const modelRates = CREDIT_COST_PER_TOKEN[model];
    if (!modelRates) {
      throw new Error(`No credit rates found for model ${model}`);
    }

    const inputCredits = promptTokens * modelRates.inputCredits;
    const outputCredits = completionTokens * modelRates.outputCredits;
    const totalCredits = inputCredits + outputCredits;

    return totalCredits.toFixed(6);
  }

  public static calculateMessageTokens(userMessage: string, aiResponse: string): TokenInfo {
    const promptTokens = this.calculateTokens(userMessage);
    const completionTokens = this.calculateTokens(aiResponse);
    const totalTokens = promptTokens + completionTokens;

    return {
      promptTokens: promptTokens.toString(),
      completionTokens: completionTokens.toString(),
      totalTokens: totalTokens.toString()
    };
  }

  static calculateCost(provider: AIProvider, model: ModelName, promptTokens: number, completionTokens: number): number {
    const providerRates = TOKEN_RATES[provider];
    if (!providerRates) {
      throw new Error(`No token rates found for provider ${provider}`);
    }

    const rates = providerRates[model];
    if (!rates) {
      throw new Error(`No token rates found for model ${model} under provider ${provider}`);
    }

    const inputCost = (promptTokens / 1000) * rates.inputCostPer1kTokens;
    const outputCost = (completionTokens / 1000) * rates.outputCostPer1kTokens;
    return inputCost + outputCost;
  }
}
