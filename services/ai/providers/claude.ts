import { ChatAnthropic } from '@langchain/anthropic';

export class ClaudeService {
    static createModel(modelName: string): BaseChatModel {
        return new ChatAnthropic({
            modelName,
            anthropicApiKey: process.env.ANTHROPIC_API_KEY,
            // Add Claude-specific configurations
        });
    }
}
