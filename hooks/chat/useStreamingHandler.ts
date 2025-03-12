'use client';

import { useEffect, useRef, useState } from 'react';
import { logger } from '@/utils/logger';

/**
 * Interface for streaming messages
 */
interface StreamingMessage {
    id: string;
    text: string;
    role: 'assistant';
    createdAt: Date;
    completedAt?: Date;
    credits?: number;
    completed: boolean;
    model?: string;
    isSummary?: boolean;
}

// Track logged message IDs globally to prevent duplicate logs
const loggedMessageIds = new Set<string>();

/**
 * Hook to handle streaming messages
 */
export const useStreamingHandler = (providedChatId?: string) => {
    // State to track streaming messages
    const [streamingMessages, setStreamingMessages] = useState<StreamingMessage[]>([]);

    // Reference to track streaming messages for event handlers
    const streamingMessagesRef = useRef<StreamingMessage[]>([]);

    // Track the current chat ID
    const chatIdRef = useRef<string | undefined>(providedChatId);

    // Track processed message IDs to prevent duplicates
    const processedMessageIds = useRef<Set<string>>(new Set());

    // Update the ref when state changes
    useEffect(() => {
        streamingMessagesRef.current = streamingMessages;
    }, [streamingMessages]);

    // Update the chatId ref when the prop changes
    useEffect(() => {
        chatIdRef.current = providedChatId;
    }, [providedChatId]);

    // Handle message start event
    const handleMessageStart = (event: CustomEvent) => {
        const eventDetail = event.detail || {};
        const data = eventDetail.data || {};
        const id = data.id;
        const model = data.model;
        const eventChatId = eventDetail.chatId || providedChatId;

        // Skip events for other chats if we have a specific chatId
        if (providedChatId && eventChatId && providedChatId !== eventChatId) {
            return;
        }

        // Log the event for debugging - only if not already logged
        if (!loggedMessageIds.has(`start-${id}`)) {
            loggedMessageIds.add(`start-${id}`);
            logger.debug('Message start event received:', {
                id,
                model,
                eventChatId
            });
        }

        // Validate the event data
        if (!id) {
            logger.warn('Message start event missing ID', { event });
            return;
        }

        // Add a new streaming message
        setStreamingMessages(prev => {
            // Check if this message already exists
            const exists = prev.some(msg => msg.id === id);
            if (exists) {
                return prev;
            }

            // Create a new message
            const newMessage: StreamingMessage = {
                id,
                text: '',
                role: 'assistant',
                createdAt: new Date(),
                completed: false,
                model,
                isSummary: false
            };

            return [...prev, newMessage];
        });
    };

    // Handle summary start event
    const handleSummaryStart = (event: CustomEvent) => {
        const eventDetail = event.detail || {};
        const data = eventDetail.data || {};
        const id = data.id;
        const model = data.model;
        const eventChatId = eventDetail.chatId || providedChatId;

        // Skip events for other chats if we have a specific chatId
        if (providedChatId && eventChatId && providedChatId !== eventChatId) {
            return;
        }

        // Log the event for debugging - only if not already logged
        if (!loggedMessageIds.has(`summary-start-${id}`)) {
            loggedMessageIds.add(`summary-start-${id}`);
            logger.debug('Summary start event received:', {
                id,
                model,
                eventChatId
            });
        }

        // Validate the event data
        if (!id) {
            logger.warn('Summary start event missing ID', { event });
            return;
        }

        // Add a new streaming message for the summary
        setStreamingMessages(prev => {
            // Check if this message already exists
            const exists = prev.some(msg => msg.id === id);
            if (exists) {
                return prev;
            }

            // Create a new message
            const newMessage: StreamingMessage = {
                id,
                text: '',
                role: 'assistant',
                createdAt: new Date(),
                completed: false,
                model,
                isSummary: true
            };

            return [...prev, newMessage];
        });
    };

    // Handle token event
    const handleToken = (event: CustomEvent) => {
        const eventDetail = event.detail || {};
        const data = eventDetail.data || {};
        const id = data.id;
        const token = data.token;
        const sequence = data.sequence;
        const eventChatId = eventDetail.chatId || providedChatId;

        // Skip events for other chats if we have a specific chatId
        if (providedChatId && eventChatId && providedChatId !== eventChatId) {
            return;
        }

        // Skip if we don't have a valid ID or token
        if (!id || !token) {
            return;
        }

        // Update the streaming message
        setStreamingMessages(prev => {
            // Find the message index
            const messageIndex = prev.findIndex(msg => msg.id === id);
            if (messageIndex === -1) {
                // Only log occasionally for unknown messages to reduce noise
                if (sequence % 500 === 0) {
                    logger.debug('Token for unknown message:', { id, sequence });
                }
                return prev;
            }

            // Create a new array with the updated message
            const updated = [...prev];
            updated[messageIndex] = {
                ...updated[messageIndex],
                text: updated[messageIndex].text + token
            };

            return updated;
        });
    };

    // Handle message complete event
    const handleMessageComplete = (event: CustomEvent) => {
        const eventDetail = event.detail || {};
        const data = eventDetail.data || {};
        const id = data.id;
        const text = data.text;
        const credits = data.creditsDeducted || data.credits;
        const model = data.model;
        const eventChatId = eventDetail.chatId || providedChatId;

        // Skip events for other chats if we have a specific chatId
        if (providedChatId && eventChatId && providedChatId !== eventChatId) {
            return;
        }

        // Log the event for debugging - only if not already logged
        if (!loggedMessageIds.has(`complete-${id}`)) {
            loggedMessageIds.add(`complete-${id}`);
            logger.debug('Message complete event received:', {
                id,
                textLength: text?.length || 0,
                creditsDeducted: data.creditsDeducted,
                credits: data.credits,
                finalCredits: credits,
                model,
                eventChatId,
                messageType: id.startsWith('brainstorm-') ? 'brainstorm' :
                    id.startsWith('summary-') ? 'summary' : 'regular'
            });
        }

        // Validate the event data
        if (!id) {
            logger.warn('Message complete event missing ID', { event });
            return;
        }

        // Add to processed message IDs
        processedMessageIds.current.add(id);

        // Update the message
        setStreamingMessages(prev => {
            // Find the message to update
            const messageIndex = prev.findIndex(msg => msg.id === id);
            if (messageIndex === -1) {
                logger.warn('Complete event received for unknown message', { id });
                return prev;
            }

            // Create a new array with the updated message
            const updated = [...prev];
            updated[messageIndex] = {
                ...updated[messageIndex],
                text: text || updated[messageIndex].text,
                credits: credits || updated[messageIndex].credits,
                completed: true,
                model: model || updated[messageIndex].model,
                completedAt: new Date()
            };

            // Log the credits being set
            logger.debug('Setting credits for streaming message:', {
                id,
                credits,
                originalCreditsDeducted: data.creditsDeducted,
                originalCredits: data.credits
            });

            return updated;
        });

        // Dispatch a custom event to notify that this message has been completed
        // This will help prevent duplicate messages when switching tabs
        window.dispatchEvent(new CustomEvent('streamingMessageProcessed', {
            detail: {
                id,
                chatId: eventChatId,
                timestamp: new Date().toISOString()
            }
        }));

        // Remove the streaming message after a longer delay to ensure it's added to the chat store
        // Increased from 10000ms to 15000ms to give much more time for the chat store to update
        setTimeout(() => {
            setStreamingMessages(prev => {
                // Only remove the message if it's still in the array
                const messageExists = prev.some(msg => msg.id === id);
                if (!messageExists) {
                    return prev;
                }

                return prev.filter(msg => msg.id !== id);
            });
        }, 15000); // Increased from 10000ms to 15000ms
    };

    // Handle summary complete event
    const handleSummaryComplete = (event: CustomEvent) => {
        const eventDetail = event.detail || {};
        const data = eventDetail.data || {};
        const id = data.id;
        const text = data.text;
        const credits = data.creditsDeducted || data.credits;
        const model = data.model;
        const eventChatId = eventDetail.chatId || providedChatId;

        // Skip events for other chats if we have a specific chatId
        if (providedChatId && eventChatId && providedChatId !== eventChatId) {
            return;
        }

        // Log the event for debugging - only if not already logged
        if (!loggedMessageIds.has(`summary-complete-${id}`)) {
            loggedMessageIds.add(`summary-complete-${id}`);
            logger.debug('Summary complete event received:', {
                id,
                textLength: text?.length || 0,
                creditsDeducted: data.creditsDeducted,
                credits: data.credits,
                finalCredits: credits,
                model,
                eventChatId
            });
        }

        // Validate the event data
        if (!id) {
            logger.warn('Summary complete event missing ID', { event });
            return;
        }

        // Mark the streaming message as complete
        setStreamingMessages(prev => {
            // Find the message index
            const messageIndex = prev.findIndex(msg => msg.id === id);
            if (messageIndex === -1) {
                logger.warn('Summary complete event for unknown message', { id });
                return prev;
            }

            // Create a new array with the updated message
            const updated = [...prev];
            updated[messageIndex] = {
                ...updated[messageIndex],
                text: text || updated[messageIndex].text,
                credits: credits || updated[messageIndex].credits,
                completed: true,
                model: model || updated[messageIndex].model,
                completedAt: new Date(),
                isSummary: true
            };

            // Log the credits being set
            logger.debug('Setting credits for summary message:', {
                id,
                credits,
                originalCreditsDeducted: data.creditsDeducted,
                originalCredits: data.credits
            });

            return updated;
        });

        // Dispatch a custom event to notify that this summary has been completed
        window.dispatchEvent(new CustomEvent('streamingMessageProcessed', {
            detail: {
                id,
                chatId: eventChatId,
                timestamp: new Date().toISOString(),
                isSummary: true
            }
        }));

        // Remove the streaming message after a delay
        setTimeout(() => {
            setStreamingMessages(prev => {
                return prev.filter(msg => msg.id !== id);
            });
        }, 15000);
    };

    // Handle visibility change to prevent duplicates when switching tabs
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Only log if we have messages to clean up
                const hasMessages = streamingMessagesRef.current.length > 0;
                if (hasMessages) {
                    logger.debug('Tab became visible, checking for completed messages', {
                        count: streamingMessagesRef.current.length
                    });
                }

                // Instead of clearing all completed messages, only clear those that have been
                // in the completed state for a while (likely already added to the chat store)
                const now = Date.now();
                setStreamingMessages(prev => {
                    // First check if we have any completed messages
                    const hasCompletedMessages = prev.some(msg => msg.completed);
                    if (!hasCompletedMessages) {
                        return prev;
                    }

                    // Keep messages that are not completed or were completed recently
                    const filtered = prev.filter(msg => {
                        // If the message is not completed, keep it
                        if (!msg.completed) return true;

                        // If the message doesn't have a completedAt timestamp, keep it
                        if (!msg.completedAt) return true;

                        // If the message was completed less than 15 seconds ago, keep it
                        // This gives plenty of time for the message to be added to the chat store
                        const messageAge = now - msg.completedAt.getTime();
                        return messageAge < 15000; // 15 seconds
                    });

                    // Only log if we actually removed messages
                    const removedCount = prev.length - filtered.length;
                    if (removedCount > 0) {
                        logger.debug('Removed completed messages on tab visibility change:', {
                            removed: removedCount,
                            remaining: filtered.length
                        });
                    }

                    return filtered;
                });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Set up event listeners
    useEffect(() => {
        // Add event listeners
        window.addEventListener('messageStart', handleMessageStart as EventListener);
        window.addEventListener('token', handleToken as EventListener);
        window.addEventListener('messageComplete', handleMessageComplete as EventListener);
        window.addEventListener('summaryStart', handleSummaryStart as EventListener);
        window.addEventListener('summaryComplete', handleSummaryComplete as EventListener);

        // Log that listeners are set up - only once per chatId
        if (!loggedMessageIds.has(`listeners-setup-${providedChatId}`)) {
            loggedMessageIds.add(`listeners-setup-${providedChatId}`);
            logger.debug('Streaming event listeners set up', { chatId: providedChatId });
        }

        // Clean up event listeners
        return () => {
            window.removeEventListener('messageStart', handleMessageStart as EventListener);
            window.removeEventListener('token', handleToken as EventListener);
            window.removeEventListener('messageComplete', handleMessageComplete as EventListener);
            window.removeEventListener('summaryStart', handleSummaryStart as EventListener);
            window.removeEventListener('summaryComplete', handleSummaryComplete as EventListener);

            // Only log cleanup if we're actually changing chatId
            if (providedChatId !== chatIdRef.current) {
                logger.debug('Streaming event listeners cleaned up', {
                    oldChatId: chatIdRef.current,
                    newChatId: providedChatId
                });
            }
        };
    }, [providedChatId]); // Re-add listeners when chatId changes

    // Return the streaming messages and a function to clear them
    return {
        streamingMessages,
        clearStreamingMessages: () => setStreamingMessages([])
    };
}; 