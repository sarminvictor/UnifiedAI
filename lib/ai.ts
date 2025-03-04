import { AIProvider, AIModel } from '@/types/ai.types';
import { TOKEN_RATES } from '@/utils/ai.constants';

export const getModelsForProvider = (provider: AIProvider): AIModel[] => {
    const models: AIModel[] = [];
    const providerRates = TOKEN_RATES[provider];

    if (!providerRates) return models;

    for (const [modelName, config] of Object.entries(providerRates)) {
        models.push({
            provider,
            name: modelName,
            maxTokens: 4096, // Default max tokens, you can adjust this based on model
            costPer1kTokens: config.costPer1kTokens
        });
    }

    return models;
};

export const getDefaultModelForProvider = (provider: AIProvider): string => {
    switch (provider) {
        case AIProvider.OPENAI:
            return 'gpt-3.5-turbo';
        case AIProvider.GEMINI:
            return 'gemini-pro';
        case AIProvider.ANTHROPIC:
            return 'claude-2';
        case AIProvider.DEEPSEEK:
            return 'deepseek-chat';
        default:
            return 'gpt-3.5-turbo';
    }
}; 