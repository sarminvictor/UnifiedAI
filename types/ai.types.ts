import { BaseChatModel } from "@langchain/core/language_models/chat_models";

export interface ChatMessage {
  user_input: string | null;
  api_response: string | null;
}

export interface TokenInfo {
  promptTokens: string;
  completionTokens: string;
  totalTokens: string;
}

export interface APIModelConfig {
  temperature: number;
  maxTokens?: number;
}

export interface APIUsageData {
  userId: string;
  chatId: string;
  modelName: string;
  tokensUsed: string;
  promptTokens: string;
  completionTokens: string;
  creditsDeducted: string;
  messageIds: string[];
}

export interface AIModelResponse {
  text: string | undefined;
}

export interface SummaryConfig {
  llm: BaseChatModel;
  previousMessages: ChatMessage[];
  currentUserMessage: string;
  currentAiResponse: string;
}

export enum ModelName {
  ChatGPT = 'gpt-3.5-turbo',
  Claude = 'claude-3-haiku-20240307',
  Gemini = 'gemini-1.5-pro',
  DeepSeek = 'deepseek-chat'
}

export enum AIProvider {
  OPENAI = 'openai',
  GEMINI = 'gemini',
  ANTHROPIC = 'anthropic',
  DEEPSEEK = 'deepseek'
}

export interface AIModel {
  provider: AIProvider;
  name: string;
  maxTokens: number;
  costPer1kTokens: number;
}
