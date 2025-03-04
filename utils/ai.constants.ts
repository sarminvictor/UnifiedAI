import { APIModelConfig, ModelName } from '@/types/ai.types';
import { AIProvider } from '@/types/ai.types';

export const MODEL_PROVIDER_MAP: Record<ModelName, AIProvider> = {
  [ModelName.ChatGPT]: AIProvider.OPENAI,
  [ModelName.Claude]: AIProvider.ANTHROPIC,
  [ModelName.Gemini]: AIProvider.GEMINI,
  [ModelName.DeepSeek]: AIProvider.DEEPSEEK,
};

// This defines how many internal credits we charge per token for each model
export const CREDIT_COST_PER_TOKEN = {
  [ModelName.ChatGPT]: {
    name: 'GPT-3.5 Turbo',
    inputCredits: 0.001,    // 1 credit per 1000 input tokens
    outputCredits: 0.002,   // 2 credits per 1000 output tokens
  },
  [ModelName.Claude]: {
    name: 'Claude 3 Haiku',
    inputCredits: 0.002,    // 2 credits per 1000 input tokens
    outputCredits: 0.004,   // 4 credits per 1000 output tokens
  },
  [ModelName.Gemini]: {
    name: 'Gemini 1.5 Pro',
    inputCredits: 0.0015,   // 1.5 credits per 1000 input tokens
    outputCredits: 0.003,   // 3 credits per 1000 output tokens
  },
  [ModelName.DeepSeek]: {
    name: 'DeepSeek Chat',
    inputCredits: 0.0005,   // 0.5 credits per 1000 input tokens
    outputCredits: 0.001,   // 1 credit per 1000 output tokens
  }
} as const;

// API provider costs in USD (for our reference/cost tracking)
export const TOKEN_RATES: Record<AIProvider, Record<string, { inputCostPer1kTokens: number; outputCostPer1kTokens: number }>> = {
  [AIProvider.OPENAI]: {
    'gpt-3.5-turbo': {
      inputCostPer1kTokens: 0.0005,
      outputCostPer1kTokens: 0.0015
    },
    'gpt-4': {
      inputCostPer1kTokens: 0.03,
      outputCostPer1kTokens: 0.06
    },
  },
  [AIProvider.GEMINI]: {
    'gemini-1.5-pro': {
      inputCostPer1kTokens: 0.00125,
      outputCostPer1kTokens: 0.005
    },
  },
  [AIProvider.ANTHROPIC]: {
    'claude-3-haiku-20240307': {
      inputCostPer1kTokens: 0.003,
      outputCostPer1kTokens: 0.0015
    },
  },
  [AIProvider.DEEPSEEK]: {
    'deepseek-chat': {
      inputCostPer1kTokens: 0.00014,
      outputCostPer1kTokens: 0.00028
    },
  },
};

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
  [ModelName.ChatGPT]: "You are ChatGPT, a large language model trained by OpenAI. Follow instructions carefully. Provide clear, detailed, and conversational responses.",
  [ModelName.Claude]: "You are Claude, an AI assistant created by Anthropic. Follow instructions carefully. Provide clear, detailed, and conversational responses.",
  [ModelName.Gemini]: "You are Gemini, an AI assistant created by Google. Follow instructions carefully. Provide clear, detailed, and conversational responses.",
  [ModelName.DeepSeek]: "You are DeepSeek, an AI assistant created by DeepSeek. Follow instructions carefully. Provide clear, detailed, and conversational responses.",
  SUMMARY_GENERATION: "Generate a brief summary of this conversation that captures the main topics and key points discussed:"
} as const;
