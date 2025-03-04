import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { MODEL_CONFIGS } from '@/utils/ai.constants';
import { ModelName } from '@/types/ai.types';
import { serverLogger } from '@/utils/serverLogger';

export class ServerModelFactory {
  public static async createModel(modelName: ModelName): Promise<BaseChatModel> {
    try {
      serverLogger.info('Creating AI model:', { modelName });

      const config = MODEL_CONFIGS[modelName];

      switch (modelName) {
        case ModelName.ChatGPT:
          if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
          }
          return new ChatOpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "gpt-4o",
            ...config
          });

        // ...rest of model cases...
        default:
          throw new Error(`Unsupported model: ${modelName}`);
      }
    } catch (error) {
      serverLogger.error('Model creation error:', {
        modelName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}
