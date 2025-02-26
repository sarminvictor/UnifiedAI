import { APIModelConfig, ModelName } from '@/types/ai.types';

export const TOKEN_RATES = {
  "ChatGPT": 1278,    // 1 credit = 1,278 GPT-4 tokens
  "Gemini": 42624,    // 1 credit = 42,624 Gemini tokens
  "DeepSeek": 23164,  // 1 credit = 23,164 DeepSeek tokens
  "Claude": 888       // 1 credit = 888 Claude 3.5 Sonnet tokens
} as const;

export const MODEL_CONFIGS = {
  [ModelName.ChatGPT]: {
    temperature: 0.7,
    maxTokens: 2000
  },
  [ModelName.Claude]: {
    temperature: 0.7,
    maxTokens: 2000
  },
  [ModelName.Gemini]: {
    temperature: 0.7,
    maxTokens: 2000
  },
  [ModelName.DeepSeek]: {
    temperature: 0.7,
    maxTokens: 2000
  }
} as const;

export const CHAT_CONSTANTS = {
  SUMMARY_THRESHOLD: 10,
  DEFAULT_MESSAGE_LIMIT: 10,
  TOKENS_PER_CHAR: 4 // Approximate token count (4 characters per token)
} as const;

export const SYSTEM_PROMPTS = {
  DEFAULT_CHAT: "You are ChatGPT, a large language model trained by OpenAI. Follow instructions carefully. Provide clear, detailed, and conversational responses.",
  SUMMARY_GENERATION: "Generate a brief summary of this conversation that captures the main topics and key points discussed:"
} as const;
