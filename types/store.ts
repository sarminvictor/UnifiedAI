export interface BaseMessage {
  userInput: string;
  apiResponse: string;
  inputType: string;
  outputType: string;
  timestamp: string;
  contextId: string;
  model?: string;
  tokensUsed?: string;
  creditsDeducted?: string;
}

export interface ChatMessage extends BaseMessage {
  chat_id: string | null;
  messageId: string;
  brainstormMessages?: string[];
}

export interface ChatSession {
  chat_id: string;
  chat_title?: string;
  messages: ChatMessage[];
  model: string;
  updated_at: string;
}

export interface ChatStateData {
  activeChats: ChatSession[];
}

export interface ChatState {
  currentChatId: string | null;
  credits: number | null;
  chatSessions: ChatSession[];
  selectedModel: string;
  setIsLoading: (loading: boolean) => void;
  setCurrentChatId: (id: string | null) => void;
  setSelectedModel: (model: string) => void;
  refreshChats: (callback: (prevState: ChatStateData) => ChatStateData) => void;
  refreshCredits: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export type ApiResponse<T> = {
  data: T;
  status: 'success' | 'error';
  message?: string;
};

export type ChatApiResponse = ApiResponse<{
  activeChats: ChatSession[];
}>;
