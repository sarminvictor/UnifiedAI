import axios from 'axios';

const openaiApiKey = process.env.OPENAI_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;
const claudeApiKey = process.env.CLAUDE_API_KEY;
const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

const apiService = {
  async callOpenAI(endpoint: string, data: any) {
    const response = await axios.post(
      `https://api.openai.com/v1/${endpoint}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },

  async callGemini(endpoint: string, data: any) {
    const response = await axios.post(
      `https://api.gemini.com/v1/${endpoint}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${geminiApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },

  async callClaude(endpoint: string, data: any) {
    const response = await axios.post(
      `https://api.claude.com/v1/${endpoint}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${claudeApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },

  async callDeepSeek(endpoint: string, data: any) {
    const response = await axios.post(
      `https://api.deepseek.com/v1/${endpoint}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${deepseekApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },
};

export default apiService;
