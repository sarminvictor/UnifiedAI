'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { logger } from '@/utils/logger';
import ChatMessage from './ChatMessage';
import { useChatStore } from '@/store/chat/chatStore';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

// Define the message interface
interface Message {
  id: string;
  userInput: string;
  apiResponse: string;
  timestamp: string;
  model?: string;
  creditsDeducted?: number;
  inputType?: string;
  outputType?: string;
}

// Define the props for the chat container component
interface ChatContainerProps {
  chatId: string;
}

// Track the last streaming count per chat
const lastStreamingCount: Record<string, number> = {};

// Track active streaming toasts
const activeStreamingToasts: Record<string, string> = {};

/**
 * Utility function to debounce function calls
 */
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Custom hook for smooth scrolling in chat
 */
const useSmoothScroll = (dependencies: any[] = []) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isNearTop, setIsNearTop] = useState(true);
  const lastScrollHeight = useRef(0);
  const lastMessageCount = useRef(0);
  const userHasScrolled = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Add a temporary lock to prevent auto-scrolling immediately after user scrolls
  const temporaryScrollLock = useRef(false);
  const scrollLockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to check scroll position
  const checkScrollPosition = useCallback(() => {
    if (!scrollRef.current) return;

    const container = scrollRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // ChatGPT uses a very small threshold for "at bottom" detection
    // This ensures more precise control over auto-scrolling
    const nearBottom = distanceFromBottom < 30;
    setIsNearBottom(nearBottom);

    // Consider "near top" if within 200px of top
    const nearTop = scrollTop < 200;
    setIsNearTop(nearTop);

    // Only update shouldAutoScroll if user has manually scrolled
    // This prevents auto-scroll from being disabled during programmatic scrolling
    if (userHasScrolled.current) {
      setShouldAutoScroll(nearBottom);

      // Reset the flag after we've processed the user scroll
      if (nearBottom) {
        userHasScrolled.current = false;
      }
    }
  }, []);

  // Check scroll position after any scroll event
  const handleScroll = useCallback(() => {
    // Set flag to indicate user has manually scrolled
    userHasScrolled.current = true;

    // Set temporary lock to prevent auto-scrolling for a short period
    temporaryScrollLock.current = true;

    // Clear any existing timeouts
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    if (scrollLockTimeoutRef.current) {
      clearTimeout(scrollLockTimeoutRef.current);
    }

    // Check position immediately for responsive UI
    checkScrollPosition();

    // And also check after a short delay to catch momentum scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      checkScrollPosition();
    }, 100);

    // Release the temporary scroll lock after a delay
    // This gives the user time to scroll without fighting the auto-scroll
    scrollLockTimeoutRef.current = setTimeout(() => {
      temporaryScrollLock.current = false;
    }, 1000); // 1 second delay before auto-scrolling can resume
  }, [checkScrollPosition]);

  // Scroll to bottom function with animation options
  const scrollToBottom = useCallback((options: { force?: boolean, behavior?: ScrollBehavior } = {}) => {
    const { force = false, behavior = 'smooth' } = options;

    if (!scrollRef.current) return;

    // Don't auto-scroll if there's a temporary lock (unless forced)
    if (temporaryScrollLock.current && !force) {
      return;
    }

    // Only scroll if we should auto-scroll or force is true
    if (shouldAutoScroll || force) {
      const scrollElement = scrollRef.current;

      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        // Check if scroll height has changed significantly
        const hasNewContent = scrollElement.scrollHeight > lastScrollHeight.current + 10;
        lastScrollHeight.current = scrollElement.scrollHeight;

        // Use instant scrolling for small changes to avoid jank
        const effectiveBehavior = hasNewContent ? behavior : 'auto';

        scrollElement.scrollTo({
          top: scrollElement.scrollHeight,
          behavior: effectiveBehavior
        });
      });
    }
  }, [shouldAutoScroll]);

  // Set up scroll event listener
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    // Initialize last scroll height
    lastScrollHeight.current = scrollElement.scrollHeight;

    // Check position immediately on mount
    checkScrollPosition();

    // Add scroll event listener with passive option for better performance
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      // Clean up event listener and any pending timeouts
      scrollElement.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (scrollLockTimeoutRef.current) {
        clearTimeout(scrollLockTimeoutRef.current);
      }
    };
  }, [handleScroll, checkScrollPosition]);

  // Auto-scroll when dependencies change
  useEffect(() => {
    // Check if message count has changed
    const messageCountChanged = dependencies[0] !== lastMessageCount.current;
    lastMessageCount.current = dependencies[0];

    // Only auto-scroll if user is at the bottom and there's no temporary lock
    if (isNearBottom && !temporaryScrollLock.current) {
      scrollToBottom({
        behavior: messageCountChanged ? 'smooth' : 'auto'
      });
    }
  }, [...dependencies]);

  return {
    scrollRef,
    scrollToBottom,
    isNearBottom,
    isNearTop,
    shouldAutoScroll,
    setShouldAutoScroll,
    // Add method to manually reset user scroll state
    resetUserScrollState: () => {
      userHasScrolled.current = false;
      temporaryScrollLock.current = false;
    }
  };
};

/**
 * Component to display chat messages and streaming responses
 */
const ChatContainer: React.FC<ChatContainerProps> = ({ chatId }) => {
  // Get data from the store
  const isLoading = useChatStore(state => state.isLoading);
  const messages = useChatStore(state => {
    const chat = state.chats.find(c => c.chat_id === chatId);
    if (!chat) return [];

    // Check if this chat is in brainstorm mode
    const isBrainstormMode = chat.brainstorm_mode || false;

    return chat.chat_history.map(msg => {
      // Get the original input and output types from the message
      const originalInputType = msg.inputType || (msg as any).input_type || 'text';
      const originalOutputType = msg.outputType || (msg as any).output_type || 'text';

      // Determine if this is a user message (has user input but no API response)
      const isUserMessage = msg.user_input && !msg.api_response;

      // Initialize input and output types with the original values
      let inputType = originalInputType;
      let outputType = originalOutputType;

      // Special case for user messages in a brainstorm chat
      if (isBrainstormMode && isUserMessage) {
        // For ALL user messages in a brainstorm chat, ensure inputType is 'text' and outputType is 'brainstorm'
        inputType = 'text';
        outputType = 'brainstorm';

        // Log for debugging
        logger.debug('Processing user message in brainstorm chat:', {
          userInput: msg.user_input?.substring(0, 30) + (msg.user_input?.length > 30 ? '...' : ''),
          originalInputType,
          originalOutputType,
          newInputType: inputType,
          newOutputType: outputType,
          timestamp: msg.timestamp
        });
      }
      // For AI messages in a brainstorm chat
      else if (isBrainstormMode && !isUserMessage) {
        // Set both types to 'brainstorm' for AI messages in a brainstorm chat
        inputType = 'brainstorm';
        outputType = 'brainstorm';
      }

      // Special case for summary messages
      if (originalOutputType === 'summary' || (msg.api_response && !msg.user_input && msg.api_response.includes('Summary of the brainstorm'))) {
        inputType = 'brainstorm';
        outputType = 'summary';
      }

      return {
        id: `${chatId}-${msg.timestamp}`,
        userInput: msg.user_input,
        apiResponse: msg.api_response,
        timestamp: msg.timestamp,
        model: msg.model,
        creditsDeducted: msg.credits_deducted ? parseFloat(msg.credits_deducted) : undefined,
        inputType,
        outputType
      };
    });
  });

  // Get streaming messages from the store
  const streamingMessages = useChatStore(state => {
    const chatMessages = state.streamingMessages[chatId] || {};
    return Object.values(chatMessages).map(msg => ({
      id: msg.id,
      text: msg.text,
      completed: msg.isComplete,
      createdAt: msg.startTime,
      model: msg.model,
      credits: msg.credits
    }));
  });

  // Create a ref for scrolling to the bottom
  const bottomRef = useRef<HTMLDivElement>(null);

  // State to force re-render when streaming messages change
  const [forceUpdate, setForceUpdate] = useState(0);

  // Filter out messages with empty API responses and system messages
  const validMessages = useMemo(() => {
    // First, create a map to detect duplicates
    const messageMap = new Map();

    // Process messages to identify duplicates
    messages.forEach(msg => {
      // Create a unique key for the message
      const key = msg.userInput ?
        `user-${msg.timestamp}-${msg.userInput.substring(0, 50)}` :
        (msg.outputType === 'summary' ?
          `summary-${msg.timestamp}` :
          `ai-${msg.timestamp}-${msg.apiResponse.substring(0, 50)}`);

      // If this is a duplicate, keep the most recent one
      if (messageMap.has(key)) {
        const existing = messageMap.get(key);
        const existingTime = new Date(existing.timestamp).getTime();
        const currentTime = new Date(msg.timestamp).getTime();

        // Replace only if this message is newer
        if (currentTime > existingTime) {
          messageMap.set(key, msg);
        }
      } else {
        messageMap.set(key, msg);
      }
    });

    // Convert map back to array and filter
    const deduplicated = Array.from(messageMap.values());

    // Check if there's a first user message in a brainstorm chat
    const currentChat = useChatStore.getState().chats.find(c => c.chat_id === chatId);
    const isBrainstormMode = currentChat?.brainstorm_mode || false;

    if (isBrainstormMode) {
      // Find all user messages in brainstorm mode
      const userMessages = deduplicated.filter(msg =>
        msg.userInput && !msg.apiResponse
      );

      if (userMessages.length > 0) {
        logger.debug('Found user messages in brainstorm chat:', {
          count: userMessages.length
        });

        // Fix types for all user messages in brainstorm mode
        userMessages.forEach(msg => {
          if (msg.inputType !== 'text' || msg.outputType !== 'brainstorm') {
            msg.inputType = 'text';
            msg.outputType = 'brainstorm';
          }
        });
      }
    }

    // Apply additional filters
    const filtered = deduplicated.filter(msg => {
      // Skip system messages
      if (msg.inputType === 'system') return false;

      // Skip empty messages (except summaries which might have empty user input)
      if (!msg.apiResponse && !msg.userInput && msg.outputType !== 'summary') return false;

      // Special case: Always include user messages in brainstorm mode
      if (msg.userInput && !msg.apiResponse && isBrainstormMode) {
        return true;
      }

      return true;
    });

    // We don't need to add missing user messages as they should already be in the filtered list
    // This was causing duplication in brainstorm mode
    return filtered;
  }, [messages, chatId]);

  // Use our custom scroll hook after validMessages is defined
  const {
    scrollRef,
    scrollToBottom,
    isNearBottom,
    isNearTop,
    resetUserScrollState
  } = useSmoothScroll([
    validMessages?.length,
    streamingMessages.length,
    forceUpdate
  ]);

  // Function to handle scroll to bottom button click
  const handleScrollToBottom = useCallback(() => {
    // Reset user scroll state to allow auto-scrolling again
    resetUserScrollState();
    // Force scroll to bottom
    scrollToBottom({ force: true });
  }, [resetUserScrollState, scrollToBottom]);

  // Function to scroll to top - keeping the function but removing the button
  const scrollToTop = useCallback(() => {
    if (!scrollRef.current) return;

    scrollRef.current.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  // Force re-render when streaming messages are updated
  useEffect(() => {
    if (streamingMessages.length > 0) {
      // Use requestAnimationFrame for smoother updates
      let rafId: number;
      let lastUpdateTime = 0;
      const updateInterval = 100; // Update at most every 100ms to reduce CPU usage and make scrolling smoother

      const updateMessages = (timestamp: number) => {
        // Throttle updates to reduce CPU usage and make scrolling smoother
        if (timestamp - lastUpdateTime < updateInterval) {
          rafId = requestAnimationFrame(updateMessages);
          return;
        }

        lastUpdateTime = timestamp;
        setForceUpdate(prev => prev + 1);

        // Show toast for streaming messages
        streamingMessages.forEach(message => {
          if (!message.completed) {
            const toastId = `streaming-${message.id}`;
            const modelName = message.model || 'AI';

            // Calculate a fake progress based on message length
            // This is just for visual feedback, not actual progress
            const textLength = message.text.length;
            const progress = Math.min(Math.max(textLength / 500, 0.1), 0.9);

            // Only create a toast if one doesn't already exist for this message
            if (!activeStreamingToasts[message.id]) {
              activeStreamingToasts[message.id] = toastId;
              toast.loading(`${modelName} is thinking...`, {
                id: toastId,
                duration: Infinity, // Keep until completed
                description: `Generating response...`,
                // @ts-ignore - Sonner has a progress prop but it might not be in the types
                progress
              });
            } else {
              // Update existing toast with new progress
              toast.loading(`${modelName} is thinking...`, {
                id: activeStreamingToasts[message.id],
                duration: Infinity,
                description: `Generating response...`,
                // @ts-ignore - Sonner has a progress prop but it might not be in the types
                progress
              });
            }
          } else if (activeStreamingToasts[message.id]) {
            // Dismiss the toast when the message is complete
            toast.dismiss(activeStreamingToasts[message.id]);
            delete activeStreamingToasts[message.id];
          }
        });

        // Only scroll to bottom if user is already at the bottom and not temporarily locked
        if (isNearBottom) {
          scrollToBottom({ behavior: 'auto' });
        }

        // Continue animation loop if we still have streaming messages
        if (streamingMessages.some(msg => !msg.completed)) {
          rafId = requestAnimationFrame(updateMessages);
        } else {
          // When all messages are complete, check if we should scroll to bottom
          // This ensures the final message is visible if user was at bottom before
          if (isNearBottom) {
            scrollToBottom({ behavior: 'smooth' });
          }
        }
      };

      // Start the animation loop
      rafId = requestAnimationFrame(updateMessages);

      return () => {
        // Clean up animation frame on unmount or when dependencies change
        cancelAnimationFrame(rafId);
      };
    }
  }, [streamingMessages, scrollToBottom, isNearBottom]);

  // Cleanup toasts when component unmounts
  useEffect(() => {
    return () => {
      // Dismiss all active toasts when component unmounts
      Object.values(activeStreamingToasts).forEach(toastId => {
        toast.dismiss(toastId);
      });
    };
  }, []);

  // Log streaming messages for debugging - only log once per 5 seconds
  useEffect(() => {
    if (streamingMessages.length > 0) {
      const logInterval = setInterval(() => {
        // Only log if the count has changed since last time
        if (lastStreamingCount[chatId] !== streamingMessages.length) {
          lastStreamingCount[chatId] = streamingMessages.length;
          logger.debug('Current streaming messages count:', {
            count: streamingMessages.length,
            chatId
          });
        }
      }, 5000); // Log once per 5 seconds instead of every second

      return () => clearInterval(logInterval);
    }
  }, [streamingMessages.length, chatId]);

  // Render streaming messages with optimized rendering
  const renderStreamingMessages = useCallback((): React.ReactNode => {
    if (streamingMessages.length === 0) return null;

    logger.debug('Rendering streaming messages:', {
      count: streamingMessages.length,
      chatId
    });

    // Check if this chat is in brainstorm mode
    const currentChatForStreaming = useChatStore.getState().chats.find(c => c.chat_id === chatId);
    const isBrainstormModeForStreaming = currentChatForStreaming?.brainstorm_mode || false;

    // Check if we have user messages in the regular messages
    if (isBrainstormModeForStreaming && validMessages) {
      const userMessages = validMessages.filter(msg =>
        msg.userInput && !msg.apiResponse &&
        msg.inputType === 'text' && msg.outputType === 'brainstorm'
      );

      if (userMessages.length > 0) {
        logger.debug('User messages exist in validMessages when rendering streaming:', {
          count: userMessages.length
        });
      }
    }

    return streamingMessages.map(message => {
      // Skip empty messages
      if (!message.text && message.completed) return null;

      // Check if this message already exists in the regular messages
      // This helps prevent duplicates when switching tabs
      const isDuplicate = validMessages ? validMessages.some(validMsg =>
        validMsg.apiResponse === message.text &&
        (!validMsg.userInput || validMsg.userInput === '')
      ) : false;

      if (isDuplicate) {
        logger.debug('Skipping duplicate streaming message:', { id: message.id });
        return null;
      }

      // Determine if this is a user message (usually starts with 'user-')
      const isUserMessage = message.id.startsWith('user-');

      // Initialize input and output types
      let inputType = 'text';
      let outputType = 'text';

      // Special case for user messages in a brainstorm chat
      if (isBrainstormModeForStreaming && isUserMessage) {
        // For user messages in a brainstorm chat, set inputType to 'text' and outputType to 'brainstorm'
        inputType = 'text';
        outputType = 'brainstorm';
      }
      // For AI messages in a brainstorm chat
      else if (isBrainstormModeForStreaming && !isUserMessage) {
        // Set both types to 'brainstorm' for AI messages in a brainstorm chat
        inputType = 'brainstorm';
        outputType = 'brainstorm';
      }

      // Special case for summary messages
      if (message.id.startsWith('summary-')) {
        inputType = 'brainstorm';
        outputType = 'summary';
      }

      // Create a message object for the ChatMessage component
      const streamingMessage = {
        id: `streaming-${message.id}-${forceUpdate}`,
        userInput: '',
        apiResponse: message.text,
        timestamp: message.createdAt.toISOString(),
        model: message.model,
        creditsDeducted: message.credits ? parseFloat(message.credits) : undefined,
        inputType,
        outputType
      };

      return (
        <div key={`${message.id}-${forceUpdate}`} className="mb-4">
          <ChatMessage message={streamingMessage} />
        </div>
      );
    });
  }, [streamingMessages, validMessages, chatId, forceUpdate]);

  return (
    <div
      ref={scrollRef}
      className="flex flex-col h-full overflow-y-auto px-6 sm:px-10 md:px-16 lg:px-20 py-6 space-y-4 scroll-smooth max-w-5xl mx-auto"
    >
      {/* Display regular messages */}
      {validMessages?.map((message: Message) => (
        <ChatMessage
          key={message.id}
          message={message}
        />
      ))}

      {/* Display streaming messages */}
      {renderStreamingMessages()}

      {/* ChatGPT-style scroll indicator that appears when not at bottom */}
      {!isNearBottom && (
        <button
          onClick={handleScrollToBottom}
          className="fixed bottom-24 right-8 bg-white text-gray-600 p-3 rounded-full shadow-lg hover:bg-gray-100 transition-all z-10 border border-gray-200 flex items-center justify-center"
          aria-label="Scroll to bottom"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default ChatContainer;