'use client';

import React from "react";
import { useChatStore } from '@/store/chat/chatStore';
import { useAISettings } from '@/store/chat/aiSettings';
import { AIProvider, AIModel, ModelName } from '@/types/ai.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getModelsForProvider } from '@/lib/ai';

interface ChatHeaderProps {
  selectedModel: ModelName;
  setSelectedModel: (model: ModelName) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ selectedModel, setSelectedModel }) => {
  const { provider, setProvider, model, setModel } = useAISettings();

  return (
    <div className="bg-white border-b p-4 flex justify-between items-center">
      <div className="flex items-center">
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value as ModelName)}
          className="border rounded p-2"
        >
          <option value={ModelName.ChatGPT}>GPT-3.5 Turbo</option>
          <option value={ModelName.Claude}>Claude</option>
          <option value={ModelName.Gemini}>Gemini</option>
          <option value={ModelName.DeepSeek}>DeepSeek</option>
        </select>
      </div>
    </div>
  );
};

export default ChatHeader;
