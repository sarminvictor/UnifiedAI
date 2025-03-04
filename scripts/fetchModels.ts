import "dotenv/config";

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
