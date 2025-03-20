'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useChatSettings } from '@/hooks/chat/useChatSettings';
import { ModelName } from '@/types/ai.types';
import { BrainstormSettings } from '@/types/chat/settings';
import { useChatStore } from '@/store/chat/chatStore';
import { logger } from '@/utils/logger';
import { chatService } from '@/services/chatService';
import { toast } from 'sonner';

interface BrainstormSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const BrainstormSettingsModal = ({
    open,
    onOpenChange,
}: BrainstormSettingsModalProps) => {
    const { settings, updateBrainstormSettings } = useChatSettings();
    const { currentChatId, chats, dispatch, selectedModel } = useChatStore();
    const [localSettings, setLocalSettings] = useState<BrainstormSettings>(
        settings.brainstormSettings
    );
    const [isSaving, setIsSaving] = useState(false);

    // Update local settings when settings change
    useEffect(() => {
        setLocalSettings(settings.brainstormSettings);
    }, [settings.brainstormSettings]);

    const handleSave = async () => {
        setIsSaving(true);

        try {
            // Check if this is a temporary chat
            const isTemp = currentChatId?.startsWith('temp_');

            logger.debug('BrainstormSettingsModal: Saving settings', {
                currentChatId,
                isTemp,
                settings: {
                    messagesLimit: localSettings.messagesLimit,
                    customPromptLength: localSettings.customPrompt?.length,
                    summaryModel: localSettings.summaryModel,
                    additionalModel: localSettings.additionalModel,
                    mainModel: localSettings.mainModel || selectedModel
                }
            });

            // Ensure the main model is included in the settings
            const settingsWithModel = {
                ...localSettings,
                mainModel: localSettings.mainModel || selectedModel
            };

            // For existing chats (not temporary), save directly to the database
            if (currentChatId && !isTemp) {
                try {
                    const currentChat = chats.find(chat => chat.chat_id === currentChatId);

                    logger.debug('Saving settings to database for existing chat:', {
                        chatId: currentChatId,
                        settings: {
                            messagesLimit: settingsWithModel.messagesLimit,
                            customPromptLength: settingsWithModel.customPrompt?.length,
                            summaryModel: settingsWithModel.summaryModel
                        }
                    });

                    // Save to database
                    await chatService.updateChat(currentChatId, {
                        chat_title: currentChat?.chat_title || "New Chat",
                        brainstorm_mode: settings.brainstormMode,
                        brainstorm_settings: settingsWithModel
                    });

                    logger.debug('Settings saved to database successfully');
                    toast.success('Settings saved successfully');
                } catch (error) {
                    logger.error('Failed to save settings to database:', error);
                    toast.error('Failed to save settings');
                }
            } else {
                logger.debug('Skipping database save for temporary chat, updating local state only');
                toast.info('Settings will be saved when you send your first message');
            }

            // Update local state via the hook (with skipSave=true since we already saved if needed)
            await updateBrainstormSettings(settingsWithModel, true);

            // Also update the store directly for immediate UI feedback
            if (currentChatId) {
                dispatch({
                    type: 'UPDATE_CHAT',
                    payload: {
                        chatId: currentChatId,
                        updates: {
                            brainstorm_settings: settingsWithModel
                        }
                    }
                });

                logger.debug('Updated chat store with new settings', {
                    chatId: currentChatId,
                    settings: {
                        messagesLimit: settingsWithModel.messagesLimit,
                        customPromptLength: settingsWithModel.customPrompt?.length,
                        summaryModel: settingsWithModel.summaryModel
                    }
                });
            }
        } catch (error) {
            logger.error('Error saving settings:', error);
            toast.error('An error occurred while saving settings');
        } finally {
            setIsSaving(false);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-white">
                <DialogHeader>
                    <DialogTitle>Brainstorm Settings</DialogTitle>
                    <DialogDescription>
                        Configure how your brainstorming session will work.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="messagesLimit">Messages Limit: {localSettings.messagesLimit}</Label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm">2</span>
                            <Slider
                                id="messagesLimit"
                                min={2}
                                max={20}
                                step={1}
                                value={[localSettings.messagesLimit]}
                                onValueChange={(value: number[]) => setLocalSettings({ ...localSettings, messagesLimit: value[0] })}
                                className="flex-1"
                            />
                            <span className="text-sm">20</span>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="customPrompt">Custom Prompt</Label>
                        <Textarea
                            id="customPrompt"
                            value={localSettings.customPrompt}
                            onChange={(e) => setLocalSettings({ ...localSettings, customPrompt: e.target.value })}
                            rows={5}
                            className="bg-white"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="summaryModel">Summary Model</Label>
                        <Select
                            value={localSettings.summaryModel}
                            onValueChange={(value: string) => setLocalSettings({ ...localSettings, summaryModel: value })}
                        >
                            <SelectTrigger id="summaryModel" className="bg-white">
                                <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                <SelectItem value={ModelName.ChatGPT}>GPT-3.5 Turbo</SelectItem>
                                <SelectItem value={ModelName.Claude}>Claude</SelectItem>
                                <SelectItem value={ModelName.Gemini}>Gemini</SelectItem>
                                <SelectItem value={ModelName.DeepSeek}>DeepSeek</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Additional model is now only shown in the header */}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BrainstormSettingsModal; 