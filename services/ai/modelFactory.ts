import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { MODEL_CONFIGS } from '@/constants/ai.constants';
import { ModelName } from '@/types/ai.types';
import { serverLogger } from '@/utils/serverLogger';

export class AIModelFactory {
  public static async createModel(modelName: ModelName): Promise<BaseChatModel> {
    try {
      serverLogger.info('Creating AI model:', { 
        modelName,
        config: MODEL_CONFIGS[modelName],
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        env: {
          NODE_ENV: process.env.NODE_ENV,
          hasKey: !!process.env.OPENAI_API_KEY
        }
      });

      // Validate environment variables
      if (!process.env.OPENAI_API_KEY) {
        serverLogger.error('OpenAI API key missing');
        throw new Error('Missing OpenAI API key');
      }

      const config = MODEL_CONFIGS[modelName];

      switch (modelName) {
        case ModelName.ChatGPT:
          if (!process.env.OPENAI_API_KEY) {
            serverLogger.error('OpenAI API Key missing');
            throw new Error('OpenAI API key not configured');
          }
          return new ChatOpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "gpt-4",
            ...config
          });

        case ModelName.Claude:
          if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('Missing Anthropic API key');
          }
          return new ChatAnthropic({ 
            anthropicApiKey: process.env.ANTHROPIC_API_KEY,
            ...config
          });

        case ModelName.Gemini:
          if (!process.env.GOOGLE_API_KEY) {
            throw new Error('Missing Google API key');
          }
          return new ChatGoogleGenerativeAI({ 
            apiKey: process.env.GOOGLE_API_KEY,
            ...config
          });

        case ModelName.DeepSeek:
          return new ChatOpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "gpt-3.5-turbo",
            ...config
          });

        default:
          throw new Error(`Unsupported AI Model: ${modelName}`);
      }
    } catch (error) {
      serverLogger.error('Model creation error:', {
        modelName,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        config: MODEL_CONFIGS[modelName]
      });
      throw error;
    }
  }
}
