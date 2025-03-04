import { ChatDeepSeek } from '@langchain/deepseek';

export class DeepSeekService {
    static createModel(modelName: string): BaseChatModel {
        return new ChatDeepSeek({
            modelName,
            apiKey: process.env.DEEPSEEK_API_KEY,
            // Add DeepSeek-specific configurations
        });
    }
}
