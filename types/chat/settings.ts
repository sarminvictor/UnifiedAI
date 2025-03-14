import { AIModel, AIProvider, ModelName } from '../ai.types';
import { BRAINSTORM_PROMPTS } from '@/utils/prompts';

export interface BrainstormSettings {
    messagesLimit: number;
    customPrompt: string;
    summaryModel: string;
    additionalModel: string;
    mainModel?: string;
}

export const DEFAULT_BRAINSTORM_SETTINGS: BrainstormSettings = {
    messagesLimit: 2,
    customPrompt: BRAINSTORM_PROMPTS.DEFAULT_BRAINSTORM,
    summaryModel: ModelName.ChatGPT,
    additionalModel: ModelName.ChatGPT,
    mainModel: ModelName.ChatGPT,
};

export interface ChatSettings {
    brainstormMode: boolean;
    brainstormSettings: BrainstormSettings;
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
    brainstormMode: false,
    brainstormSettings: DEFAULT_BRAINSTORM_SETTINGS,
}; 