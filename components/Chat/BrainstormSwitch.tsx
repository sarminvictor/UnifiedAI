'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useChatSettings } from '@/hooks/chat/useChatSettings';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { useChatStore } from '@/store/chat/chatStore';
import { chatService } from '@/services/chatService';

interface BrainstormSwitchProps {
    onSettingsClick: () => void;
    onToggle?: (isOn: boolean) => void;
}

export const BrainstormSwitch = ({ onSettingsClick, onToggle }: BrainstormSwitchProps) => {
    const { settings, updateSettings, toggleBrainstormMode } = useChatSettings();
    const [isChecked, setIsChecked] = useState(settings.brainstormMode);
    const { currentChatId, chats, dispatch } = useChatStore();

    useEffect(() => {
        setIsChecked(settings.brainstormMode);
        logger.debug('BrainstormSwitch: Settings updated from hook', {
            brainstormMode: settings.brainstormMode
        });
    }, [settings.brainstormMode]);

    const handleToggle = async () => {
        const newValue = !isChecked;
        setIsChecked(newValue); // Update local state immediately for responsive UI

        // Notify parent component
        if (onToggle) {
            onToggle(newValue);
        }

        try {
            // Check if this is a temporary chat
            const isTemp = currentChatId?.startsWith('temp_');

            logger.debug('BrainstormSwitch: Toggling brainstorm mode', {
                from: isChecked,
                to: newValue,
                currentChatId,
                isTemp
            });

            if (currentChatId) {
                const currentChat = chats.find(chat => chat.chat_id === currentChatId);

                if (currentChat) {
                    // Prepare update data for the store
                    const updateData = {
                        brainstorm_mode: newValue,
                        brainstorm_settings: settings.brainstormSettings,
                        model: currentChat.model, // Preserve the current model
                        chat_title: currentChat.chat_title || "New Chat"
                    };

                    // Always update the chat in the store
                    dispatch({
                        type: 'UPDATE_CHAT',
                        payload: {
                            chatId: currentChatId,
                            updates: updateData
                        }
                    });

                    // Toggle brainstorm mode through the hook
                    // The hook will handle skipping DB save for temp chats
                    await toggleBrainstormMode();
                }
            }
        } catch (error) {
            logger.error('BrainstormSwitch: Error toggling brainstorm mode', error);
            // Revert local state if there was an error
            setIsChecked(isChecked);
            if (onToggle) {
                onToggle(isChecked);
            }
        }
    };

    return (
        <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
                <Switch
                    id="brainstorm-mode"
                    checked={isChecked}
                    onCheckedChange={handleToggle}
                    className="data-[state=checked]:bg-[#111827] [&>span]:bg-white"
                />
                <Label htmlFor="brainstorm-mode" className="text-xs sm:text-sm font-medium">
                    Brainstorm
                </Label>
            </div>

            {isChecked && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onSettingsClick}
                    className="h-8 w-8 rounded-full"
                >
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">Brainstorm Settings</span>
                </Button>
            )}
        </div>
    );
};

export default BrainstormSwitch; 