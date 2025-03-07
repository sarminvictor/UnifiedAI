'use client';

import React, { useState, useEffect } from "react";
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
import { BrainstormSwitch } from './BrainstormSwitch';
import { BrainstormSettingsModal } from './BrainstormSettingsModal';
import { useChatSettings } from '@/hooks/chat/useChatSettings';
import { DEFAULT_BRAINSTORM_SETTINGS } from '@/types/chat/settings';
import { logger } from '@/utils/logger';
import { chatService } from '@/services/chatService';

interface ChatHeaderProps {
  selectedModel: ModelName;
  setSelectedModel: (model: ModelName) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ selectedModel, setSelectedModel }) => {
  const { provider, setProvider, model, setModel } = useAISettings();
  const { settings, updateSettings, updateBrainstormSettings } = useChatSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [localBrainstormMode, setLocalBrainstormMode] = useState(false);
  const { currentChatId, chats, dispatch } = useChatStore();

  // Sync local state with settings
  useEffect(() => {
    setLocalBrainstormMode(settings.brainstormMode);
    logger.debug("Brainstorm mode updated:", settings.brainstormMode);
  }, [settings.brainstormMode]);

  const handleAdditionalModelChange = (value: string) => {
    // Check if this is a temporary chat
    const isTemp = currentChatId?.startsWith('temp_');

    logger.debug("Changing additional model to:", {
      value,
      currentChatId,
      isTemp
    });

    // Update the brainstorm settings - the hook will handle skipping DB save for temp chats
    updateBrainstormSettings({
      additionalModel: value
    });

    // Also update the store directly for immediate UI feedback
    if (currentChatId) {
      const currentChat = chats.find(chat => chat.chat_id === currentChatId);
      if (currentChat) {
        const updatedSettings = {
          ...currentChat.brainstorm_settings,
          additionalModel: value
        };

        dispatch({
          type: 'UPDATE_CHAT',
          payload: {
            chatId: currentChatId,
            updates: {
              brainstorm_settings: updatedSettings
            }
          }
        });
      }
    }
  };

  // Custom model change handler to preserve brainstorm mode
  const handleModelChange = async (value: string) => {
    // Check if this is a temporary chat
    const isTemp = currentChatId?.startsWith('temp_');

    logger.debug("Changing main model to:", {
      value,
      currentChatId,
      isTemp,
      brainstormMode: settings.brainstormMode
    });

    if (currentChatId) {
      const currentChat = chats.find(chat => chat.chat_id === currentChatId);

      if (currentChat) {
        // Update brainstorm settings to include the new model
        const updatedBrainstormSettings = {
          ...settings.brainstormSettings,
          mainModel: value
        };

        // Prepare update data with preserved brainstorm settings
        const updateData = {
          brainstorm_mode: settings.brainstormMode,
          brainstorm_settings: updatedBrainstormSettings,
          chat_title: currentChat.chat_title || "New Chat"
        };

        // Only update the database if this is not a temporary chat
        if (!isTemp) {
          try {
            logger.debug("Updating chat in database:", {
              chatId: currentChatId,
              updateData
            });

            // Update the chat in the database
            await chatService.updateChat(currentChatId, updateData);
          } catch (error) {
            logger.error("Error updating chat model in database:", error);
          }
        } else {
          logger.debug("Skipping database update for temporary chat");
        }

        // Always update the model in the store
        dispatch({
          type: 'UPDATE_CHAT',
          payload: {
            chatId: currentChatId,
            updates: updateData
          }
        });
      }
    }

    // Then set the selected model
    setSelectedModel(value as ModelName);
  };

  // Get the current additional model value, with fallback to default
  const additionalModel = settings.brainstormSettings?.additionalModel || DEFAULT_BRAINSTORM_SETTINGS.additionalModel;

  logger.debug("Rendering ChatHeader:", {
    localBrainstormMode,
    settingsBrainstormMode: settings.brainstormMode,
    additionalModel,
    selectedModel,
    currentChatId,
    isTemp: currentChatId?.startsWith('temp_')
  });

  return (
    <div className="bg-white border-b p-4 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <BrainstormSwitch
          onSettingsClick={() => setSettingsOpen(true)}
          onToggle={(isOn) => {
            logger.debug("Toggle callback:", isOn);
            setLocalBrainstormMode(isOn);
          }}
        />

        <Select
          value={selectedModel}
          onValueChange={handleModelChange}
        >
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value={ModelName.ChatGPT}>GPT-3.5 Turbo</SelectItem>
            <SelectItem value={ModelName.Claude}>Claude</SelectItem>
            <SelectItem value={ModelName.Gemini}>Gemini</SelectItem>
            <SelectItem value={ModelName.DeepSeek}>DeepSeek</SelectItem>
          </SelectContent>
        </Select>

        {localBrainstormMode && (
          <Select
            value={additionalModel}
            onValueChange={handleAdditionalModelChange}
          >
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Additional model" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value={ModelName.ChatGPT}>GPT-3.5 Turbo</SelectItem>
              <SelectItem value={ModelName.Claude}>Claude</SelectItem>
              <SelectItem value={ModelName.Gemini}>Gemini</SelectItem>
              <SelectItem value={ModelName.DeepSeek}>DeepSeek</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <BrainstormSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
};

export default ChatHeader;
