import React from "react";
import { useChatStore } from '@/store/chat/chatStore';

interface ChatHeaderProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ selectedModel, setSelectedModel }) => {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <h2 className="text-xl font-bold">{selectedModel} Model</h2>
      <div className="flex space-x-2">
        {["ChatGPT", "Gemini", "Claude", "DeepSeek"].map((model) => (
          <button
            key={model}
            className={`px-4 py-2 rounded transition ${
              selectedModel === model ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"
            }`}
            onClick={() => setSelectedModel(model)}
          >
            {model}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChatHeader;
