import { sanitizeString, sanitizeNumber } from './sanitize';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ChatMessage {
  userInput: string;
  apiResponse: string;
  inputType: string;
  outputType: string;
  timestamp: string;
  contextId: string;
  model?: string;
  tokensUsed: string; // Keep for internal use
  creditsDeducted: string;
}

export interface ChatSession {
  chat_id: string;
  chat_title?: string;
  messages: ChatMessage[];
  model: string; // This is for UI purposes only
  updated_at: string;
}

export interface ChatApiResponse {
  activeChats: ChatSession[];
}

export interface CreditsApiResponse {
  credits_remaining: string; // Changed from number to string
  success: boolean;
}

export interface SendMessageResponse {
  success: boolean;
  userMessage: any;
  aiMessage: {
    api_response: string;
  };
  model: string;
  tokensUsed: string; // Changed from number to string
  creditsDeducted: string; // Changed from number to string
  error?: string; // Add optional error field
}

export interface SendMessageParams {
  chatId: string;
  userMessage: string;
  modelName: string;
}

// Add formatter functions
export const formatNumber = {
  tokens: (value: string | undefined): string => 
    value?.toString() || "0",
  credits: (value: string | undefined): string => {
    if (!value) return "0.000000";
    const num = parseFloat(value);
    return isNaN(num) ? "0.000000" : num.toFixed(6);
  }
};

// Add message factory functions
export const createMessage = {
  user: (text: string, chatId: string): ChatMessage => ({
    userInput: sanitizeString(text),
    apiResponse: "",
    inputType: "Text",
    outputType: "Text",
    timestamp: new Date().toISOString(),
    contextId: sanitizeString(chatId),
    tokensUsed: "0",
    creditsDeducted: "0.000000"
  }),
  ai: (response: SendMessageResponse, chatId: string): ChatMessage => ({
    userInput: "",
    apiResponse: sanitizeString(response.aiMessage?.api_response),
    model: sanitizeString(response.model),
    tokensUsed: sanitizeNumber(response.tokensUsed),
    creditsDeducted: sanitizeNumber(response.creditsDeducted),
    inputType: "Text",
    outputType: "Text",
    timestamp: new Date().toISOString(),
    contextId: sanitizeString(chatId)
  }),
  error: (error: Error, chatId: string): ChatMessage => ({
    userInput: "",
    apiResponse: sanitizeString(`Error: ${error.message || 'AI response failed'}`),
    inputType: "Text",
    outputType: "Text",
    timestamp: new Date().toISOString(),
    contextId: chatId,
    tokensUsed: "0",
    creditsDeducted: "0.000000"
  })
};

const handleApiResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  try {
    const data = await response.json();
    console.log('API Response:', {
      status: response.status,
      data: data
    });

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const getChats = async (): Promise<ApiResponse<ChatApiResponse>> => {
  try {
    const res = await fetch("/api/getChats");
    const data = await handleApiResponse<ChatApiResponse>(res);
    return data;
  } catch (error) {
    console.error('Failed to fetch chats:', error);
    throw error;
  }
};

export const getChat = async (chatId: string): Promise<ApiResponse<ChatSession>> => {
  try {
    const res = await fetch(`/api/getChat?chatId=${chatId}`);
    return handleApiResponse<ChatSession>(res);
  } catch (error) {
    console.error('Failed to fetch chat:', error);
    throw error;
  }
};

export const getUserCredits = async (): Promise<CreditsApiResponse> => {
  const res = await fetch("/api/getUserCredits");
  const data = await res.json();
  console.log("Credits API Response:", data);
  return data;
};

export const sendMessage = async ({ chatId, userMessage, modelName }: SendMessageParams): 
  Promise<SendMessageResponse> => {
  try {
    // Validate inputs
    if (!chatId?.trim()) throw new Error("chatId is required");
    if (!userMessage?.trim()) throw new Error("userMessage is required");
    if (!modelName?.trim()) throw new Error("modelName is required");

    const validModels = ["ChatGPT", "Gemini", "Claude", "DeepSeek"];
    if (!validModels.includes(modelName)) {
      throw new Error(`Invalid model. Must be one of: ${validModels.join(", ")}`);
    }

    console.log("📤 Sending request:", { chatId, modelName });

    const res = await fetch("/api/chatWithGPT", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, userMessage, modelName }),
    });

    const data = await res.json();
    console.log("📥 API Response:", data);

    if (!res.ok || !data.success) {
      throw new Error(data.message || `HTTP error! status: ${res.status}`);
    }

    return {
      ...data,
      tokensUsed: formatNumber.tokens(data.tokensUsed),
      creditsDeducted: formatNumber.credits(data.creditsDeducted)
    };
  } catch (error) {
    console.error("❌ Send Message Error:", error);
    throw error;
  }
};

export const saveChat = async (chatId: string, chatTitle: string): Promise<ApiResponse<void>> => {
  const res = await fetch("/api/saveChat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, chatTitle }),
  });

  const data = await handleApiResponse<void>(res);
  console.log("Save chat response:", data);
  return data;
};

export const deleteChat = async (chatId: string): Promise<ApiResponse<void>> => {
  const res = await fetch("/api/deleteChat", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId }),
  });
  return handleApiResponse<void>(res);
};
