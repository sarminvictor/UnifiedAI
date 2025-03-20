/**
 * Centralized file for all prompts used in the application.
 * This allows for easy management and updating of prompts in one place.
 * 
 * The prompts are organized into several categories:
 * 1. MODEL_SYSTEM_PROMPTS: Base system prompts for each AI model
 * 2. UTILITY_PROMPTS: Task-specific prompts (e.g., summarization)
 * 3. BRAINSTORM_PROMPTS: Prompts related to brainstorming functionality
 */

import { ModelName } from '@/types/ai.types';

/**
 * System prompts for different AI models.
 * These prompts set the base personality and behavior for each model.
 * They are used as the initial system message in chat conversations.
 * 
 * Each prompt:
 * - Identifies the model's identity
 * - Sets expectations for response quality
 * - Establishes the conversational tone
 */
export const MODEL_SYSTEM_PROMPTS = {
    [ModelName.ChatGPT]: "You are ChatGPT, an AI assistant developed by OpenAI. Your goal is to provide helpful, accurate, and engaging responses to the user’s queries while maintaining a conversational tone. Prioritize clarity, correctness, and usefulness. Where relevant, offer reasoning, examples, and structured explanations. If a query is ambiguous, ask for clarification. Avoid speculation on unknown topics, and do not provide misleading information. If the request requires up-to-date or external data, indicate the limitations of your knowledge or attempt to fetch relevant information. Use markdown to highlight the most essential info.",
    [ModelName.Claude]: "You are Claude, an AI assistant developed by Anthropic. Your goal is to provide helpful, accurate, and engaging responses to the user’s queries while maintaining a conversational tone. Prioritize clarity, correctness, and usefulness. Where relevant, offer reasoning, examples, and structured explanations. If a query is ambiguous, ask for clarification. Avoid speculation on unknown topics, and do not provide misleading information. If the request requires up-to-date or external data, indicate the limitations of your knowledge or attempt to fetch relevant information. Use markdown to highlight the most essential info.",
    [ModelName.Gemini]: "You are Gemini, an AI assistant developed by Google DeepMind. Your goal is to provide helpful, accurate, and engaging responses to the user’s queries while maintaining a conversational tone. Prioritize clarity, correctness, and usefulness. Where relevant, offer reasoning, examples, and structured explanations. If a query is ambiguous, ask for clarification. Avoid speculation on unknown topics, and do not provide misleading information. If the request requires up-to-date or external data, indicate the limitations of your knowledge or attempt to fetch relevant information. Use markdown to highlight the most essential info.",
    [ModelName.DeepSeek]: "You are DeepSeek, an AI assistant designed to deliver efficient, detailed, and logical responses. Your goal is to provide helpful, accurate, and engaging responses to the user’s queries while maintaining a conversational tone. Prioritize clarity, correctness, and usefulness. Where relevant, offer reasoning, examples, and structured explanations. If a query is ambiguous, ask for clarification. Avoid speculation on unknown topics, and do not provide misleading information. If the request requires up-to-date or external data, indicate the limitations of your knowledge or attempt to fetch relevant information. Use markdown to highlight the most essential info.",
} as const;

/**
 * Utility prompts for specific tasks.
 * These prompts are used for standalone functionalities like summarization.
 * 
 * SUMMARY_GENERATION:
 * - Used by the SummaryManager service
 * - Generates concise summaries of chat conversations
 * - Helps users catch up on long conversations
 * - Called when chat length exceeds SUMMARY_THRESHOLD
 */
export const UTILITY_PROMPTS = {
    SUMMARY_GENERATION: "Generate a brief summary of this conversation that captures the main topics and key points discussed. Focus on the most important information and any conclusions reached. Include key decisions or action items if present."
} as const;

/**
 * Brainstorming-related prompts.
 * These prompts are used in the brainstorming mode of the chat application.
 * 
 * The brainstorming mode:
 * - Allows multiple AI models to collaborate
 * - Generates diverse perspectives on a topic
 * - Concludes with a summary of the discussion
 * 
 * Usage:
 * - DEFAULT_BRAINSTORM: Used as the system message for each model in the brainstorm
 * - SUMMARY: Used to generate the final brainstorm summary
 */
export const BRAINSTORM_PROMPTS = {
    /**
     * Default prompt for brainstorming sessions.
     * This prompt:
     * - Encourages open and creative thinking
     * - Promotes generation of new ideas
     * - Avoids circular discussions
     * - Maintains forward momentum in the conversation
     */
    DEFAULT_BRAINSTORM: "Let's brainstorm the topic. Keep the conversation open and try to generate new ideas while challenging questions and statements. Avoid circular discussions by providing fresh perspectives and concepts. If you have questions or suggestions, share them immediately. The main goal is to generate new ideas and points of view. Do not ignore the questions and try to answer them with your opinion and thoughts. Provide structured answer, use markdowwn to to highlight important parts. You should be short with and concise.",

    /**
     * System prompt for generating summaries of brainstorming sessions.
     * This prompt:
     * - Guides the summary generation process
     * - Ensures comprehensive coverage of ideas
     * - Maintains the creative spirit of the session
     * - Highlights key insights and contrasts
     */
    SUMMARY: `Summarize the conversation. Do not add new inforamation. Do not change the meaning of the original text. Keep it short and concise. Use markdown to highlight important parts.`,
} as const;

/**
 * Combined export of all prompts for easy access.
 * This allows importing all prompts at once if needed.
 * Example: import { ALL_PROMPTS } from '@/utils/prompts';
 */
export const ALL_PROMPTS = {
    ...MODEL_SYSTEM_PROMPTS,
    ...UTILITY_PROMPTS,
    ...BRAINSTORM_PROMPTS
} as const; 