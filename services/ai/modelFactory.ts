import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatDeepSeek } from "@langchain/deepseek";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { MODEL_CONFIGS } from '@/utils/ai.constants';
import { ModelName } from '@/types/ai.types';
import { serverLogger } from '@/utils/serverLogger';
import { AIProvider } from '@/types/ai.types';

export class AIModelFactory {
  static async createModel(provider: AIProvider, modelName: string): Promise<BaseChatModel> {
    serverLogger.info('Creating AI model with:', { provider, modelName });

    // Normalize provider to lowercase for comparison
    const normalizedProvider = provider.toLowerCase();

    switch (normalizedProvider) {
      case AIProvider.OPENAI.toLowerCase():
        return this.createOpenAIModel(modelName);
      case AIProvider.GEMINI.toLowerCase():
        return this.createGeminiModel(modelName);
      case AIProvider.ANTHROPIC.toLowerCase():
        return this.createClaudeModel(modelName);
      case AIProvider.DEEPSEEK.toLowerCase():
        return this.createDeepSeekModel(modelName);
      default:
        serverLogger.error('Unsupported AI provider:', { provider, modelName });
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  private static async createOpenAIModel(modelName: string): Promise<BaseChatModel> {
    try {
      serverLogger.info('Creating OpenAI model:', {
        modelName,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        env: {
          NODE_ENV: process.env.NODE_ENV,
          hasKey: !!process.env.OPENAI_API_KEY
        }
      });

      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      return new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: modelName || "gpt-3.5-turbo",
        temperature: 0.7,
        maxTokens: 2000
      });
    } catch (error) {
      serverLogger.error('OpenAI model creation error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private static async createClaudeModel(modelName: string): Promise<BaseChatModel> {
    try {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('Anthropic API key not configured');
      }

      return new ChatAnthropic({
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        modelName: modelName || "claude-2",
        temperature: 0.7,
        maxTokens: 2000
      });
    } catch (error) {
      serverLogger.error('Claude model creation error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private static async createGeminiModel(modelName: string): Promise<BaseChatModel> {
    try {
      if (!process.env.GOOGLE_API_KEY) {
        throw new Error('Google API key not configured');
      }

      return new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY,
        modelName: modelName,
        temperature: 0.7,
        maxOutputTokens: 2000
      });
    } catch (error) {
      serverLogger.error('Gemini model creation error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private static async createDeepSeekModel(modelName: string): Promise<BaseChatModel> {
    try {
      if (!process.env.DEEPSEEK_API_KEY) {
        throw new Error('DeepSeek API key not configured');
      }

      return new ChatDeepSeek({
        apiKey: process.env.DEEPSEEK_API_KEY,
        modelName: modelName,
        temperature: 0.7,
        maxTokens: 2000
      });
    } catch (error) {
      serverLogger.error('DeepSeek model creation error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
}
