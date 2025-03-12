import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { BrainstormSettings, ChatSettings, DEFAULT_CHAT_SETTINGS, DEFAULT_BRAINSTORM_SETTINGS } from '@/types/chat/settings';
import { useChatStore } from '@/store/chat/chatStore';
import { chatService } from '@/services/chatService';
import { logger } from '@/utils/logger';

export const useChatSettings = () => {
    const params = useParams();
    const chatId = params?.chatId as string;
    const { chats, currentChatId, selectedModel } = useChatStore();
    const currentChat = chats.find(chat => chat.chat_id === currentChatId);

    const [settings, setSettings] = useState<ChatSettings>(DEFAULT_CHAT_SETTINGS);

    useEffect(() => {
        if (currentChat) {
            setSettings({
                brainstormMode: currentChat.brainstorm_mode || false,
                brainstormSettings: currentChat.brainstorm_settings || DEFAULT_BRAINSTORM_SETTINGS,
            });
            logger.debug('Settings updated from currentChat:', {
                brainstormMode: currentChat.brainstorm_mode,
                brainstormSettings: {
                    messagesLimit: currentChat.brainstorm_settings?.messagesLimit,
                    customPromptLength: currentChat.brainstorm_settings?.customPrompt?.length,
                    summaryModel: currentChat.brainstorm_settings?.summaryModel,
                    additionalModel: currentChat.brainstorm_settings?.additionalModel,
                    mainModel: currentChat.brainstorm_settings?.mainModel
                }
            });
        } else {
            // Reset to default settings for new chats
            setSettings(DEFAULT_CHAT_SETTINGS);
            logger.debug('Settings reset to defaults (no currentChat)');
        }
    }, [currentChat]);

    const updateSettings = useCallback(async (newSettings: Partial<ChatSettings>, skipSave = false) => {
        const updatedSettings = { ...settings, ...newSettings };
        setSettings(updatedSettings);
        logger.debug('Settings updated locally:', {
            brainstormMode: updatedSettings.brainstormMode,
            brainstormSettings: {
                messagesLimit: updatedSettings.brainstormSettings?.messagesLimit,
                customPromptLength: updatedSettings.brainstormSettings?.customPrompt?.length,
                summaryModel: updatedSettings.brainstormSettings?.summaryModel,
                additionalModel: updatedSettings.brainstormSettings?.additionalModel,
                mainModel: updatedSettings.brainstormSettings?.mainModel
            }
        });

        // Skip saving to database if requested or if this is a temporary chat
        const isTemp = chatId?.startsWith('temp_');
        if (skipSave || isTemp) {
            logger.debug('Skipping save to database:', { skipSave, isTemp, chatId });
            return;
        }

        if (chatId) {
            try {
                // Include the current model in the brainstorm settings
                // but preserve all other settings
                const brainstormSettingsWithModel = {
                    ...updatedSettings.brainstormSettings,
                    mainModel: selectedModel // Store the main model in brainstorm settings
                };

                logger.debug('Saving settings to DB:', {
                    chatId,
                    brainstorm_mode: updatedSettings.brainstormMode,
                    brainstorm_settings: {
                        messagesLimit: brainstormSettingsWithModel.messagesLimit,
                        customPromptLength: brainstormSettingsWithModel.customPrompt?.length,
                        summaryModel: brainstormSettingsWithModel.summaryModel,
                        additionalModel: brainstormSettingsWithModel.additionalModel,
                        mainModel: brainstormSettingsWithModel.mainModel
                    },
                    chat_title: currentChat?.chat_title
                });

                await chatService.updateChat(chatId, {
                    chat_title: currentChat?.chat_title || "New Chat",
                    brainstorm_mode: updatedSettings.brainstormMode,
                    brainstorm_settings: brainstormSettingsWithModel
                });

                logger.debug('Settings saved to DB successfully');
            } catch (error) {
                logger.error('Failed to save settings to DB:', error);
            }
        } else {
            logger.debug('No chatId available, settings not saved to DB');
        }
    }, [chatId, settings, currentChat, selectedModel]);

    const toggleBrainstormMode = useCallback(async (skipSave = false) => {
        logger.debug('Toggling brainstorm mode:', !settings.brainstormMode);
        await updateSettings({ brainstormMode: !settings.brainstormMode }, skipSave);
    }, [settings.brainstormMode, updateSettings]);

    const updateBrainstormSettings = useCallback(async (newBrainstormSettings: Partial<BrainstormSettings>, skipSave = false) => {
        logger.debug('Updating brainstorm settings:', {
            messagesLimit: newBrainstormSettings.messagesLimit,
            customPromptLength: newBrainstormSettings.customPrompt?.length,
            summaryModel: newBrainstormSettings.summaryModel,
            additionalModel: newBrainstormSettings.additionalModel,
            mainModel: newBrainstormSettings.mainModel
        });

        await updateSettings({
            brainstormSettings: {
                ...settings.brainstormSettings,
                ...newBrainstormSettings,
            },
        }, skipSave);
    }, [settings.brainstormSettings, updateSettings]);

    return {
        settings,
        updateSettings,
        toggleBrainstormMode,
        updateBrainstormSettings,
    };
};

export default useChatSettings; 