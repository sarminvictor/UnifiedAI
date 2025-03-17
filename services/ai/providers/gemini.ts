import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export class GeminiService {
    static createModel(modelName: string): BaseChatModel {
        return new ChatGoogleGenerativeAI({
            modelName,
            apiKey: process.env.GOOGLE_API_KEY,
            // Add Gemini-specific configurations
        });
    }
}
