import "dotenv/config";
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';

// Function to fetch OpenAI models
async function fetchOpenAIModels() {
    try {
        if (!process.env.OPENAI_API_KEY) {
            console.log("⚠️ OpenAI API key not found, skipping OpenAI models");
            return [];
        }

        console.log("📡 Fetching OpenAI models...");
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const response = await openai.models.list();
        const chatModels = response.data.filter(model =>
            model.id.includes('gpt') && !model.id.includes('instruct')
        );

        console.log(`✅ Found ${chatModels.length} OpenAI chat models`);
        return chatModels.map(model => model.id);
    } catch (error) {
        console.error("❌ Error fetching OpenAI models:", error);
        return [];
    }
}

// Function to fetch Google Gemini models
async function fetchGoogleGeminiModels() {
    try {
        if (!process.env.GOOGLE_API_KEY) {
            console.log("⚠️ Google API key not found, skipping Gemini models");
            return [];
        }

        console.log("📡 Fetching Google Gemini models...");
        // Gemini doesn't have an API to list models, so we'll return the known models
        const geminiModels = ['gemini-1.5-pro', 'gemini-1.0-pro'];

        console.log(`✅ Using ${geminiModels.length} known Gemini models`);
        return geminiModels;
    } catch (error) {
        console.error("❌ Error with Gemini models:", error);
        return [];
    }
}

// Function to fetch Anthropic Claude models
async function fetchAnthropicClaudeModels() {
    try {
        if (!process.env.ANTHROPIC_API_KEY) {
            console.log("⚠️ Anthropic API key not found, skipping Claude models");
            return [];
        }

        console.log("📡 Fetching Anthropic Claude models...");
        // Anthropic doesn't have an API to list models, so we'll return the known models
        const claudeModels = ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'];

        console.log(`✅ Using ${claudeModels.length} known Claude models`);
        return claudeModels;
    } catch (error) {
        console.error("❌ Error with Claude models:", error);
        return [];
    }
}

// Function to fetch DeepSeek models
async function fetchDeepSeekModels() {
    try {
        if (!process.env.DEEPSEEK_API_KEY) {
            console.log("⚠️ DeepSeek API key not found, skipping DeepSeek models");
            return [];
        }

        console.log("📡 Fetching DeepSeek models...");
        // DeepSeek doesn't have an API to list models, so we'll return the known models
        const deepSeekModels = ['deepseek-chat'];

        console.log(`✅ Using ${deepSeekModels.length} known DeepSeek models`);
        return deepSeekModels;
    } catch (error) {
        console.error("❌ Error with DeepSeek models:", error);
        return [];
    }
}

// Function definitions must come first
async function fetchAvailableModels() {
    console.log("🔍 Fetching Available LangChain Models...\n");

    const models = {
        OpenAI: await fetchOpenAIModels(),
        GoogleGemini: await fetchGoogleGeminiModels(),
        AnthropicClaude: await fetchAnthropicClaudeModels(),
        DeepSeek: await fetchDeepSeekModels(),
    };

    console.log("\n✅ Model fetching complete.");
    console.log("✨ Final Models List:", JSON.stringify(models, null, 2));
    return models;
}

// Run function **after** it's defined
fetchAvailableModels().then(models => {
    console.log("\n📌 Available Models:", models);
}).catch(error => {
    console.error("❌ Fetching models failed:", error);
});
