import { AIModel, AIProvider, ModelName } from '../ai.types';

export interface BrainstormSettings {
    messagesLimit: number;
    customPrompt: string;
    summaryModel: string;
    additionalModel: string;
    mainModel?: string;
}

export const DEFAULT_BRAINSTORM_SETTINGS: BrainstormSettings = {
    messagesLimit: 2,
    customPrompt: "Let's brainstorm the topic. Keep the conversation open and try to generate new ideas while challenging questions and statements. Avoid circular discussions by providing fresh perspectives and concepts. If you have questions or suggestions, share them immediately. The main goal is to generate as many new ideas and points of view as possible. We will summarize our conversation at the end, so continue contributing throughout",
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