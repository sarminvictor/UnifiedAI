import { GoogleGenerativeAI } from '@langchain/google-genai';

export class GeminiService {
    static createModel(modelName: string): BaseChatModel {
        return new GoogleGenerativeAI({
            modelName,
            apiKey: process.env.GOOGLE_API_KEY,
            // Add Gemini-specific configurations
        });
    }
}
