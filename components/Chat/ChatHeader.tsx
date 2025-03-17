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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { LogOutIcon, SettingsIcon } from 'lucide-react';
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

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
  const { data: session } = useSession();

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

  // Handle logout
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  // Get abbreviated model name (first 2 letters)
  const getAbbreviatedModelName = (modelName: string) => {
    return modelName.substring(0, 2);
  };

  // Get the current brainstorm settings
  const brainstormSettings = settings.brainstormSettings || DEFAULT_BRAINSTORM_SETTINGS;

  // Get the current additional model
  const additionalModel = brainstormSettings.additionalModel || ModelName.ChatGPT;

  logger.debug("Rendering ChatHeader:", {
    selectedModel,
    provider,
    brainstormMode: settings.brainstormMode,
    localBrainstormMode,
    additionalModel,
    currentChatId,
    isTemp: currentChatId?.startsWith('temp_')
  });

  return (
    <div className="flex items-center justify-between w-full">
      {/* Left side elements */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
        <div className="flex items-center gap-2">
          <BrainstormSwitch
            onSettingsClick={() => setSettingsOpen(true)}
            onToggle={(isOn) => {
              logger.debug("Toggle callback:", isOn);
              setLocalBrainstormMode(isOn);
              updateSettings({ brainstormMode: isOn });
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Main model selection */}
          <div className="relative w-20 sm:w-24 md:w-32 lg:w-40 h-9 bg-white rounded-md border border-solid overflow-hidden">
            <Select
              value={selectedModel}
              onValueChange={handleModelChange}
            >
              <SelectTrigger className="w-full h-full bg-white">
                <SelectValue>
                  <div className="flex items-center">
                    <span className="truncate">
                      {selectedModel === ModelName.ChatGPT ? "GPT-3.5 Turbo" :
                        selectedModel === ModelName.Claude ? "Claude" :
                          selectedModel === ModelName.Gemini ? "Gemini" :
                            selectedModel === ModelName.DeepSeek ? "DeepSeek" :
                              selectedModel}
                    </span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value={ModelName.ChatGPT}>GPT-3.5 Turbo</SelectItem>
                <SelectItem value={ModelName.Claude}>Claude</SelectItem>
                <SelectItem value={ModelName.Gemini}>Gemini</SelectItem>
                <SelectItem value={ModelName.DeepSeek}>DeepSeek</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Additional model selection (only shown in brainstorm mode) */}
          {localBrainstormMode && (
            <div className="relative w-20 sm:w-24 md:w-32 lg:w-40 h-9 bg-white rounded-md border border-solid overflow-hidden">
              <Select
                value={additionalModel}
                onValueChange={handleAdditionalModelChange}
              >
                <SelectTrigger className="w-full h-full bg-white">
                  <SelectValue>
                    <div className="flex items-center">
                      <span className="truncate">
                        {additionalModel === ModelName.ChatGPT ? "GPT-3.5 Turbo" :
                          additionalModel === ModelName.Claude ? "Claude" :
                            additionalModel === ModelName.Gemini ? "Gemini" :
                              additionalModel === ModelName.DeepSeek ? "DeepSeek" :
                                additionalModel}
                      </span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value={ModelName.ChatGPT}>GPT-3.5 Turbo</SelectItem>
                  <SelectItem value={ModelName.Claude}>Claude</SelectItem>
                  <SelectItem value={ModelName.Gemini}>Gemini</SelectItem>
                  <SelectItem value={ModelName.DeepSeek}>DeepSeek</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Right side elements - only visible on large screens (lg and above) */}
      <div className="hidden lg:flex items-center gap-4 ml-auto">
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage
              src={session?.user?.image || ""}
              alt="User avatar"
            />
            <AvatarFallback>{session?.user?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="font-normal text-neutral-900 text-sm truncate">
            {session?.user?.email || ""}
          </div>
        </div>

        <Separator orientation="vertical" className="h-8" />

        <button onClick={handleLogout} aria-label="Logout">
          <LogOutIcon className="w-5 h-5" />
        </button>
      </div>

      <BrainstormSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
};

export default ChatHeader;
