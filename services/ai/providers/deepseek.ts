import { ChatDeepSeek } from '@langchain/deepseek';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export class DeepSeekService {
    static createModel(modelName: string): BaseChatModel {
        return new ChatDeepSeek({
            modelName,
            apiKey: process.env.DEEPSEEK_API_KEY,
            // Add DeepSeek-specific configurations
        });
    }
}
