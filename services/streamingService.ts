/**
 * Streaming Service
 * 
 * This service centralizes all streaming-related functionality for the chat application.
 * It handles direct store updates, sequence management, and error recovery for streaming operations.
 */

import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { ModelName } from '@/types/ai.types';
import { useChatStore } from '@/store/chat/chatStore';

// Define event types for better type safety
export type StreamEventType =
    | 'messageStart'
    | 'token'
    | 'messageComplete'
    | 'summaryStart'
    | 'summaryComplete'
    | 'brainstormComplete'
    | 'status';

export interface StreamEvent {
    type: StreamEventType;
    chatId: string;
    data: any;
    sequence?: number;
}

export interface StreamingOptions {
    chatId: string;
    messageText: string;
    model: ModelName;
    brainstormMode?: boolean;
    brainstormSettings?: any;
    onProgress?: (step: number, total: number) => void;
    onError?: (error: Error) => void;
    onComplete?: () => void;
}

class StreamingService {
    private activeStreams: Map<string, { controller: AbortController, cleanup: () => void }> = new Map();

    // We'll keep a minimal event system for compatibility with existing code
    private eventListeners: Map<string, Set<(event: CustomEvent) => void>> = new Map();
    private dispatchedEvents: Set<string> = new Set();
    private queuedEvents: Map<string, { event: string, detail: any, timestamp: number }[]> = new Map();

    constructor() {
        // Initialize event listeners map
        ['messageStart', 'token', 'messageComplete', 'summaryStart', 'summaryComplete', 'brainstormComplete', 'status'].forEach(eventType => {
            this.eventListeners.set(eventType, new Set());
            this.queuedEvents.set(eventType, []);
        });
    }

    /**
     * Start a streaming session
     */
    async startStreaming(options: StreamingOptions) {
        const {
            chatId,
            messageText,
            model,
            brainstormMode = false,
            brainstormSettings,
            onProgress,
            onError,
            onComplete
        } = options;

        // Debug log at start of method
        logger.debug('Starting streaming session:', {
            chatId,
            messageLength: messageText.length,
            model,
            brainstormMode,
            hasSettings: !!brainstormSettings
        });

        // Create a unique ID for this stream
        const streamId = `stream-${chatId}-${Date.now()}`;

        // Create an abort controller for this stream
        const controller = new AbortController();
        this.activeStreams.set(chatId, { controller, cleanup: () => { } });

        // Define a cleanup function
        const cleanup = () => {
            this.activeStreams.delete(chatId);
            logger.debug('Streaming session cleanup complete:', { streamId, chatId });
        };

        // Store the cleanup function
        this.activeStreams.set(chatId, { controller, cleanup });

        try {
            // Fetch the stream
            const result = await this.fetchStream(
                chatId,
                messageText,
                model,
                brainstormMode,
                controller.signal
            );

            // Call the onComplete callback if provided
            if (onComplete) {
                onComplete();
            }

            // Log completion
            logger.debug('Streaming completed successfully:', { chatId, streamId });

            // Clean up
            cleanup();

            return { success: true, ...result };
        } catch (error) {
            // Handle errors
            const handleStreamError = async (err: Error) => {
                logger.error('Streaming error:', { chatId, error: err.message });

                // Call the onError callback if provided
                if (onError) {
                    onError(err);
                }

                // Clean up
                cleanup();

                return { success: false, error: err.message };
            };

            // Convert unknown error to Error type
            const typedError = error instanceof Error ? error : new Error(String(error));
            return handleStreamError(typedError);
        }
    }

    /**
     * Fetch the stream from the server
     */
    private async fetchStream(
        chatId: string,
        messageText: string,
        model: ModelName,
        brainstormMode: boolean,
        signal: AbortSignal
    ) {
        let eventCount = 0;
        let tokenCount = 0;
        let buffer = '';

        try {
            // Prepare the request body
            const body = JSON.stringify({
                chatId,
                message: messageText,
                modelName: model,
                stream: true,
                brainstormMode,
                brainstormSettings: brainstormMode ? this.getBrainstormSettings(chatId) : undefined
            });

            // Log the request
            logger.debug('Stream connection request:', {
                chatId,
                messageLength: messageText.length,
                model,
                brainstormMode
            });

            // Make the fetch request
            const response = await fetch('/api/chat/chatWithGPT', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body,
                signal
            });

            // Log the response status
            logger.debug('Stream connection established:', {
                chatId,
                status: response.status,
                statusText: response.statusText
            });

            // Check if the response is OK
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Stream request failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            // Check if the response is a stream
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                // This is a complete JSON response, not a stream
                logger.debug('Received complete JSON response instead of stream:', { chatId });

                const jsonResponse = await response.json();
                logger.debug('Complete response content:', {
                    chatId,
                    responseType: typeof jsonResponse,
                    hasText: !!jsonResponse.text
                });

                // Handle the complete response
                this.handleCompleteSingleResponse(chatId, jsonResponse);

                // Return early since we've handled the response
                return { eventCount: 1, tokenCount: jsonResponse.text?.length || 0 };
            }

            // Process the stream
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Stream reader could not be created');
            }

            // Read the stream
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // Convert the chunk to text and add to buffer
                const chunk = new TextDecoder().decode(value);
                buffer += chunk;

                // Log the received chunk for debugging
                logger.debug('Received stream chunk:', {
                    chatId,
                    chunkLength: chunk.length,
                    bufferLength: buffer.length,
                    chunk: chunk.length > 100 ? chunk.substring(0, 100) + '...' : chunk
                });

                // Split the buffer by newlines and process each line
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep the last line in the buffer if it's incomplete

                for (const line of lines) {
                    if (line.trim() === '') continue;

                    // Check if this is a server-sent event data line
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data === '[DONE]') {
                            logger.debug('Stream complete signal received:', { chatId });
                            continue;
                        }

                        try {
                            const event = JSON.parse(data);
                            logger.debug('Parsed stream event:', {
                                chatId,
                                eventType: event.event,
                                dataId: event.data?.id || 'unknown'
                            });

                            this.handleStreamEvent(chatId, event);
                            eventCount++;

                            // Count tokens
                            if (event.event === 'token' && event.data?.token) {
                                tokenCount++;
                            }
                        } catch (error) {
                            logger.error('Error parsing stream event:', {
                                line,
                                error,
                                lineLength: line.length,
                                linePreview: line.length > 100 ? line.substring(0, 100) + '...' : line
                            });
                        }
                    } else {
                        // Try to parse the line directly as JSON
                        try {
                            const event = JSON.parse(line);
                            if (event.event && event.data) {
                                logger.debug('Parsed direct JSON event:', {
                                    chatId,
                                    eventType: event.event,
                                    dataId: event.data?.id || 'unknown'
                                });

                                this.handleStreamEvent(chatId, event);
                                eventCount++;

                                // Count tokens
                                if (event.event === 'token' && event.data?.token) {
                                    tokenCount++;
                                }
                            } else {
                                logger.debug('Received non-event JSON line:', { line });
                            }
                        } catch (error) {
                            logger.debug('Received non-data line (not JSON):', {
                                line,
                                lineLength: line.length,
                                linePreview: line.length > 100 ? line.substring(0, 100) + '...' : line
                            });
                        }
                    }
                }
            }

            // If there's anything left in the buffer, try to process it
            if (buffer.trim()) {
                logger.debug('Processing remaining buffer:', {
                    bufferLength: buffer.length,
                    bufferPreview: buffer.length > 100 ? buffer.substring(0, 100) + '...' : buffer
                });

                try {
                    if (buffer.startsWith('data: ')) {
                        const data = buffer.substring(6);
                        if (data !== '[DONE]') {
                            const event = JSON.parse(data);
                            this.handleStreamEvent(chatId, event);
                            eventCount++;
                        }
                    } else {
                        // Try to parse the buffer directly as JSON
                        try {
                            const event = JSON.parse(buffer);
                            if (event.event && event.data) {
                                logger.debug('Parsed remaining buffer as JSON event:', {
                                    eventType: event.event,
                                    dataId: event.data?.id || 'unknown'
                                });

                                this.handleStreamEvent(chatId, event);
                                eventCount++;
                            } else {
                                logger.debug('Remaining buffer is not an event:', { buffer });
                            }
                        } catch (error) {
                            logger.debug('Remaining buffer is not valid JSON:', { buffer });
                        }
                    }
                } catch (error) {
                    logger.error('Error parsing final buffer:', { buffer, error });
                }
            }

            // Log completion
            logger.debug('Stream reading complete:', {
                chatId,
                eventCount,
                tokenCount,
                bufferLength: buffer.length
            });
        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') {
                logger.debug('Stream fetch aborted:', { chatId });
            } else {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.error('Error fetching stream:', { chatId, error: errorMessage });

                // Show a toast notification for the error
                toast.error('Failed to get AI response. Please try again.');

                throw error;
            }
        }

        // Return the final counts
        return {
            eventCount,
            tokenCount
        };
    }

    /**
     * Handle a complete response as if it were a stream of events
     */
    private handleCompleteSingleResponse(chatId: string, response: any) {
        // Generate a unique ID for this message
        const messageId = `complete-${chatId}-${Date.now()}`;

        // Log the full response for debugging
        logger.debug('Handling complete response:', {
            chatId,
            responseType: typeof response,
            hasSuccess: !!response?.success,
            hasUserMessage: !!response?.userMessage,
            hasAiMessage: !!response?.aiMessage,
            responseKeys: Object.keys(response || {})
        });

        // Extract model information
        const model = this.extractModelInfo(response);

        // Extract text and credits from the response
        const { text, credits, source } = this.extractTextAndCredits(response);

        // Log the extracted information
        logger.debug('Extracted from complete response:', {
            chatId,
            textLength: text?.length || 0,
            textPreview: text ? text.substring(0, 50) + (text.length > 50 ? '...' : '') : 'No text found',
            credits,
            model,
            source
        });

        // Dispatch message start event
        this.dispatchEventOnce('messageStart', {
            chatId,
            messageId,
            model,
            data: {
                id: messageId,
                model
            }
        }, `messageStart-${messageId}`);

        // Simulate token events by splitting the text into chunks
        if (text) {
            // Split the text into chunks of 5 characters
            const chunkSize = 5;
            let sequence = 0;

            for (let i = 0; i < text.length; i += chunkSize) {
                const chunk = text.substring(i, Math.min(i + chunkSize, text.length));

                // Dispatch token event
                this.dispatchEventOnce('token', {
                    chatId,
                    data: {
                        id: messageId,
                        token: chunk,
                        sequence: sequence++
                    }
                }, `token-${messageId}-${sequence}`);
            }
        }

        // Dispatch message complete event with the full text
        this.dispatchEventOnce('messageComplete', {
            chatId,
            messageId,
            text,
            credits,
            model,
            data: {
                id: messageId,
                credits,
                model
            }
        }, `messageComplete-${messageId}`);

        // Save the message to the database
        this.saveMessageToDatabase(chatId, text, credits, response);

        // Return success
        return {
            success: true,
            messageId,
            text,
            credits
        };
    }

    private extractModelInfo(response: any): string {
        // Try to extract model from various locations
        if (response?.model) {
            return response.model;
        }

        if (response?.aiMessage?.model) {
            return response.aiMessage.model;
        }

        if (response?.userMessage?.model) {
            return response.userMessage.model;
        }

        // Default to a generic model name if not found
        return 'gpt-3.5-turbo';
    }

    private extractTextAndCredits(response: any): { text: string, credits: string, source: string } {
        let text = '';
        let credits = '0';
        let source = 'unknown';

        // Log the response structure for debugging
        logger.debug('Extracting text from response:', {
            responseType: typeof response,
            hasSuccess: !!response?.success,
            hasUserMessage: !!response?.userMessage,
            hasAiMessage: !!response?.aiMessage,
            hasCreditsDeducted: !!response?.creditsDeducted,
            hasCredits: !!response?.credits,
            responseKeys: Object.keys(response || {})
        });

        // Check if response has aiMessage with api_response
        if (response?.aiMessage?.api_response) {
            text = response.aiMessage.api_response;
            credits = response.creditsDeducted || response.aiMessage.credits_deducted || '0';
            source = 'response.aiMessage.api_response';
            logger.debug('Extracted text from aiMessage.api_response:', {
                textLength: text.length,
                textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                credits,
                creditsSource: response.creditsDeducted ? 'response.creditsDeducted' :
                    response.aiMessage.credits_deducted ? 'response.aiMessage.credits_deducted' : 'default'
            });
            return { text, credits, source };
        }

        // Check if response has text directly
        if (response?.text) {
            text = response.text;
            credits = response.creditsDeducted || response.credits_deducted || '0';
            source = 'response.text';
            logger.debug('Extracted text from response.text:', {
                textLength: text.length,
                textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                credits,
                creditsSource: response.creditsDeducted ? 'response.creditsDeducted' :
                    response.credits_deducted ? 'response.credits_deducted' : 'default'
            });
            return { text, credits, source };
        }

        // Check if response has api_response directly
        if (response?.api_response) {
            text = response.api_response;
            credits = response.creditsDeducted || response.credits_deducted || '0';
            source = 'response.api_response';
            logger.debug('Extracted text from response.api_response:', {
                textLength: text.length,
                textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                credits,
                creditsSource: response.creditsDeducted ? 'response.creditsDeducted' :
                    response.credits_deducted ? 'response.credits_deducted' : 'default'
            });
            return { text, credits, source };
        }

        // If we couldn't find text in the expected places, try to find it recursively
        const findText = (obj: any, path: string = ''): { text: string | null, credits?: string } => {
            if (!obj || typeof obj !== 'object') {
                return { text: null };
            }

            // Check for common text field names
            for (const key of ['text', 'api_response', 'content', 'message']) {
                if (typeof obj[key] === 'string' && obj[key].trim().length > 0) {
                    logger.debug(`Found text in ${path}.${key}:`, {
                        textLength: obj[key].length,
                        textPreview: obj[key].substring(0, 50) + (obj[key].length > 50 ? '...' : ''),
                        hasCreditsDeducted: !!obj.creditsDeducted,
                        hasCredits: !!obj.credits_deducted
                    });
                    return {
                        text: obj[key],
                        credits: obj.creditsDeducted || obj.credits_deducted || '0'
                    };
                }
            }

            // Recursively search in nested objects
            for (const key in obj) {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    const result = findText(obj[key], `${path}.${key}`);
                    if (result.text) {
                        return result;
                    }
                }
            }

            return { text: null };
        };

        // Try to find text recursively
        const result = findText(response);
        if (result.text) {
            text = result.text;
            credits = result.credits || '0';
            source = 'recursive-search';
            logger.debug('Found text through recursive search:', {
                textLength: text.length,
                textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                credits,
                creditsSource: 'recursive-search'
            });
            return { text, credits, source };
        }

        // If we still couldn't find any text, return a placeholder
        logger.warn('Could not extract text from response:', {
            responseType: typeof response,
            responseKeys: Object.keys(response || {})
        });

        return {
            text: "I couldn't generate a response. Please try again.",
            credits: '0',
            source: 'placeholder'
        };
    }

    private async saveMessageToDatabase(chatId: string, text: string, credits: string, originalResponse: any) {
        try {
            // For AI responses, we don't need to call the API again since they're already saved by the backend
            logger.debug('Skipping API call to saveMessage for AI-only response:', {
                chatId,
                textLength: text.length,
                reason: 'AI responses are already saved by the chatWithGPT endpoint'
            });

            // Dispatch an event to update the UI immediately
            window.dispatchEvent(new CustomEvent('chatMessageReceived', {
                detail: {
                    chatId,
                    message: {
                        userInput: '',
                        apiResponse: text,
                        inputType: 'text',
                        outputType: 'text',
                        timestamp: new Date().toISOString(),
                        contextId: chatId,
                        model: this.extractModelInfo(originalResponse),
                        creditsDeducted: credits,
                        messageId: originalResponse.id
                    }
                }
            }));

            return {
                success: true,
                message: 'Message saved to database'
            };
        } catch (error) {
            logger.error('Error saving message to database:', error);
            return {
                success: false,
                message: 'Failed to save message to database'
            };
        }
    }

    /**
     * Handle stream events by updating the store directly
     */
    private handleStreamEvent(chatId: string, event: any) {
        // Log the received event for debugging
        logger.debug('Processing stream event:', {
            chatId,
            eventType: event.event,
            dataId: event.data?.id,
            dataLength: JSON.stringify(event.data).length
        });

        // Get the store dispatch function
        const dispatch = useChatStore.getState().dispatch;

        // Handle different event types
        switch (event.event) {
            case 'messageStart':
                // Log the message start event
                logger.debug('Message start event:', {
                    chatId,
                    messageId: event.data.id,
                    model: event.data.model
                });

                // Update the store directly
                dispatch({
                    type: 'START_STREAMING_MESSAGE',
                    payload: {
                        chatId,
                        messageId: event.data.id,
                        model: event.data.model
                    }
                });

                // Also dispatch to window for compatibility with existing code
                window.dispatchEvent(new CustomEvent('messageStart', {
                    detail: {
                        chatId,
                        data: event.data
                    }
                }));
                break;

            case 'token':
                // Skip logging for token events to reduce noise
                // logger.debug('Token event:', { chatId, messageId: event.data.id, sequence: event.data.sequence });

                // Update the streaming message in the store
                dispatch({
                    type: 'UPDATE_STREAMING_MESSAGE',
                    payload: {
                        chatId,
                        messageId: event.data.id,
                        token: event.data.token,
                        sequence: event.data.sequence
                    }
                });

                // Dispatch the token event
                window.dispatchEvent(new CustomEvent('token', {
                    detail: {
                        chatId,
                        data: event.data
                    }
                }));
                break;

            case 'messageComplete':
                // Log the message complete event
                logger.debug('Message complete event:', {
                    chatId,
                    messageId: event.data.id,
                    textLength: event.data.text?.length || 0,
                    credits: event.data.credits,
                    creditsDeducted: event.data.creditsDeducted,
                    model: event.data.model
                });

                // Skip if the message is empty
                if (!event.data.text) {
                    logger.debug('Skipping empty message:', {
                        chatId,
                        messageId: event.data.id
                    });
                    break;
                }

                // Ensure we have a credits value (prioritize creditsDeducted over credits)
                const creditsValue = event.data.creditsDeducted || event.data.credits || '0';

                // Update the store directly
                dispatch({
                    type: 'COMPLETE_STREAMING_MESSAGE',
                    payload: {
                        chatId,
                        messageId: event.data.id,
                        finalText: event.data.text,
                        credits: creditsValue
                    }
                });

                // Also dispatch to window for compatibility with existing code
                // Make sure we include both credits and creditsDeducted in the event data
                const eventData = {
                    ...event.data,
                    credits: creditsValue,
                    creditsDeducted: creditsValue
                };

                window.dispatchEvent(new CustomEvent('messageComplete', {
                    detail: {
                        chatId,
                        data: eventData
                    }
                }));

                // After a delay, remove the streaming message from the store
                // This helps prevent duplicate messages when switching tabs
                setTimeout(() => {
                    dispatch({
                        type: 'REMOVE_STREAMING_MESSAGE',
                        payload: {
                            chatId,
                            messageId: event.data.id
                        }
                    });
                }, 5000);
                break;

            case 'summaryStart':
                logger.debug('Summary start event:', {
                    chatId,
                    messageId: event.data.id
                });

                // Add a streaming message to the store for the summary
                dispatch({
                    type: 'START_STREAMING_MESSAGE',
                    payload: {
                        chatId,
                        messageId: event.data.id,
                        model: event.data.model
                    }
                });

                this.dispatchEventOnce('summaryStart', {
                    chatId,
                    data: event.data
                }, `summaryStart-${event.data.id}`);
                break;

            case 'summaryComplete':
                logger.debug('Summary complete event:', {
                    chatId,
                    messageId: event.data.id,
                    textLength: event.data.text?.length || 0,
                    credits: event.data.credits,
                    creditsDeducted: event.data.creditsDeducted
                });

                // Ensure we have a credits value (prioritize creditsDeducted over credits)
                const summaryCreditsValue = event.data.creditsDeducted || event.data.credits || '0';

                // Complete the streaming message in the store
                dispatch({
                    type: 'COMPLETE_STREAMING_MESSAGE',
                    payload: {
                        chatId,
                        messageId: event.data.id,
                        finalText: event.data.text,
                        credits: summaryCreditsValue
                    }
                });

                // Make sure we include both credits and creditsDeducted in the event data
                const summaryEventData = {
                    ...event.data,
                    credits: summaryCreditsValue,
                    creditsDeducted: summaryCreditsValue
                };

                this.dispatchEventOnce('summaryComplete', {
                    chatId,
                    data: summaryEventData
                }, `summaryComplete-${event.data.id}`);

                // After a delay, remove the streaming message from the store
                setTimeout(() => {
                    dispatch({
                        type: 'REMOVE_STREAMING_MESSAGE',
                        payload: {
                            chatId,
                            messageId: event.data.id
                        }
                    });
                }, 5000);
                break;

            case 'brainstormComplete':
                logger.debug('Brainstorm complete event:', {
                    chatId,
                    messageId: event.data.id,
                    credits: event.data.credits,
                    creditsDeducted: event.data.creditsDeducted
                });

                // Ensure we have a credits value (prioritize creditsDeducted over credits)
                const brainstormCreditsValue = event.data.creditsDeducted || event.data.credits || '0';

                // Make sure we include both credits and creditsDeducted in the event data
                const brainstormEventData = {
                    ...event.data,
                    credits: brainstormCreditsValue,
                    creditsDeducted: brainstormCreditsValue
                };

                this.dispatchEventOnce('brainstormComplete', {
                    chatId,
                    data: brainstormEventData
                }, `brainstormComplete-${event.data.id}`);
                break;

            case 'status':
                logger.debug('Status event:', {
                    chatId,
                    status: event.data.status,
                    message: event.data.message
                });
                this.dispatchEventOnce('status', {
                    chatId,
                    data: event.data
                }, `status-${chatId}-${Date.now()}`);
                break;

            default:
                logger.warn('Unknown event type:', {
                    chatId,
                    eventType: event.event,
                    data: event.data
                });
        }
    }

    /**
     * Dispatch an event only once
     */
    dispatchEventOnce(eventName: string, detail: any, eventId: string) {
        // Skip if already dispatched
        if (this.dispatchedEvents.has(eventId)) {
            // Only log non-token events to reduce noise
            if (eventName !== 'token') {
                logger.debug(`Skipping duplicate event dispatch: ${eventName}`, { eventId });
            }
            return;
        }

        // Mark as dispatched
        this.dispatchedEvents.add(eventId);

        // Log the event being dispatched (except tokens to reduce noise)
        if (eventName !== 'token' || (eventName === 'token' && detail.data?.sequence % 10 === 0)) {
            logger.debug(`Dispatching event: ${eventName}`, {
                eventId,
                detail: eventName === 'token' ?
                    { id: detail.data?.id, hasToken: !!detail.data?.token, sequence: detail.data?.sequence } :
                    detail
            });
        }

        try {
            // Ensure we have listeners for this event type
            if (!this.eventListeners.has(eventName)) {
                logger.debug(`No listeners registered for event: ${eventName}`, {
                    registeredEvents: Array.from(this.eventListeners.keys())
                });
            }

            // Create and dispatch the event
            const customEvent = new CustomEvent(eventName, { detail });
            window.dispatchEvent(customEvent);

            // For important events, log confirmation of dispatch
            if (eventName === 'messageStart' || eventName === 'messageComplete') {
                logger.debug(`Successfully dispatched ${eventName} event`, {
                    eventId,
                    messageId: detail.data?.id,
                    chatId: detail.chatId,
                    listenerCount: this.eventListeners.get(eventName)?.size || 0
                });

                // Directly call listeners for critical events as a backup mechanism
                if (this.eventListeners.has(eventName)) {
                    this.eventListeners.get(eventName)!.forEach(listener => {
                        try {
                            listener(customEvent);
                        } catch (error) {
                            logger.error(`Error in direct listener call for ${eventName}:`, {
                                error: error instanceof Error ? error.message : String(error)
                            });
                        }
                    });
                }
            }
        } catch (error) {
            logger.error(`Error dispatching ${eventName} event:`, {
                error: error instanceof Error ? error.message : String(error),
                eventId,
                detail
            });
        }

        // Clean up old event IDs periodically
        this.cleanupOldEventIds();
    }

    /**
     * Clean up old event IDs to prevent memory leaks
     */
    private cleanupOldEventIds() {
        // Remove old event IDs to prevent memory leaks
        const now = Date.now();
        const oldIds = Array.from(this.dispatchedEvents).filter(id => {
            const [, timestamp] = id.split('-');
            return now - parseInt(timestamp) > 60000; // Remove IDs older than 1 minute
        });

        oldIds.forEach(id => this.dispatchedEvents.delete(id));

        if (oldIds.length > 0) {
            logger.debug('Cleaned up old event IDs:', { count: oldIds.length });
        }
    }

    /**
     * Add an event listener
     */
    addEventListener(eventName: string, listener: (event: CustomEvent) => void) {
        // Ensure we have a set for this event type
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, new Set());
        }

        // Add the listener to the set
        this.eventListeners.get(eventName)!.add(listener);

        // Add the event listener to the window object
        window.addEventListener(eventName, listener as EventListener);

        logger.debug(`Added event listener for ${eventName}`, {
            listenerCount: this.eventListeners.get(eventName)!.size,
            eventName
        });

        // Return a function to remove this listener
        return () => {
            this.removeEventListener(eventName, listener);
        };
    }

    /**
     * Remove an event listener
     */
    removeEventListener(eventName: string, listener: (event: CustomEvent) => void) {
        this.eventListeners.get(eventName)?.delete(listener);
        window.removeEventListener(eventName, listener as EventListener);
    }

    /**
     * Abort all active streams
     */
    abortAllStreams() {
        logger.debug('Aborting all active streams:', { count: this.activeStreams.size });

        for (const [streamId, { controller, cleanup }] of this.activeStreams.entries()) {
            logger.debug('Aborting stream:', { streamId });
            controller.abort();
            cleanup();
        }

        this.activeStreams.clear();
    }

    /**
     * Abort a specific stream
     */
    abortStream(chatId: string) {
        logger.debug('Aborting streams for chat:', { chatId });

        for (const [streamId, { controller, cleanup }] of this.activeStreams.entries()) {
            if (streamId.includes(chatId)) {
                logger.debug('Aborting stream:', { streamId });
                controller.abort();
                cleanup();
                this.activeStreams.delete(streamId);
            }
        }
    }

    /**
     * Get brainstorm settings for a chat
     */
    private getBrainstormSettings(chatId: string): any {
        // Try to get settings from local storage first
        try {
            const settingsKey = `brainstorm_settings_${chatId}`;
            const storedSettings = localStorage.getItem(settingsKey);
            if (storedSettings) {
                return JSON.parse(storedSettings);
            }
        } catch (error) {
            logger.warn('Error retrieving brainstorm settings from localStorage:', {
                chatId,
                error: error instanceof Error ? error.message : String(error)
            });
        }

        // Return default settings if none found
        return {
            messagesLimit: 2,
            customPromptLength: 425,
            summaryModel: 'gpt-3.5-turbo',
            additionalModel: 'gpt-3.5-turbo',
            mainModel: 'gpt-3.5-turbo'
        };
    }
}

// Export a singleton instance
export const streamingService = new StreamingService(); 