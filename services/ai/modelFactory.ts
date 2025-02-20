import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { MODEL_CONFIGS } from '@/constants/ai.constants';
import { ModelName } from '@/types/ai.types';

export class AIModelFactory {
  public static createModel(modelName: ModelName): BaseChatModel {
    const config = MODEL_CONFIGS[modelName];
    
    switch (modelName) {
      case "ChatGPT":
        return new ChatOpenAI({
          openAIApiKey: process.env.OPENAI_API_KEY,
          modelName: "gpt-4",
          ...config
        });

      case "Claude":
        return new ChatAnthropic({ 
          anthropicApiKey: process.env.ANTHROPIC_API_KEY,
          ...config
        });

      case "Gemini":
        return new ChatGoogleGenerativeAI({ 
          apiKey: process.env.GOOGLE_API_KEY,
          ...config
        });

      case "DeepSeek":
        return new ChatOpenAI({
          openAIApiKey: process.env.OPENAI_API_KEY,
          modelName: "gpt-3.5-turbo",
          ...config
        });

      default:
        throw new Error(`Unsupported AI Model: ${modelName}`);
    }
  }
}
