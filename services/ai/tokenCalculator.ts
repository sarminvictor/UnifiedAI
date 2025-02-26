import { TOKEN_RATES, CHAT_CONSTANTS } from '@/utils/ai.constants';
import { TokenInfo, ModelName } from '@/types/ai.types';

export class TokenCalculator {
  public static calculateTokens(text: string): number {
    return Math.ceil(text.length / CHAT_CONSTANTS.TOKENS_PER_CHAR);
  }

  public static calculateCredits(model: ModelName, tokensUsed: number): string {
    const tokensPerCredit = TOKEN_RATES[model] || TOKEN_RATES["ChatGPT"];
    return (tokensUsed / tokensPerCredit).toFixed(6);
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
}
