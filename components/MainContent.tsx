'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Sidebar from "@/components/Sidebar/Sidebar";
import ChatHeader from "@/components/Chat/ChatHeader";
import ChatContainer from "@/components/Chat/ChatContainer";
import ChatInput from "@/components/Chat/ChatInput";
import { convertChatMessage } from '@/utils/chatUtils';
import { useChatStore } from '@/store/chat/chatStore';
import { useChatActions } from '@/store/chat/chatActions';
import { useVisibilityEffect } from '@/hooks/chat/useVisibilityEffect';
import { mutate } from 'swr';
import { useChats } from '@/hooks/chat/useChats';
import { logger } from '@/utils/logger';
import { ModelName } from '@/types/ai.types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PanelLeft, XIcon } from 'lucide-react';

interface MainContentProps {
  chatId: string;
}

export const MainContent = ({ chatId }: MainContentProps) => {
  const { chats, currentChatId, selectedModel, isLoading, credits, dispatch } = useChatStore();
  const { error, mutate: refreshChats } = useChats();
  const actions = useChatActions();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Only track pending validations, don't track shown errors
  const pendingValidation = useRef<boolean>(false);
  const pendingChatIds = useRef<Set<string>>(new Set());

  // Handle URL chat ID validation, always showing errors
  useEffect(() => {
    const urlChatId = window?.location?.pathname?.split('/c/')?.[1];

    // Skip if no chat ID in URL or already matched current chat
    if (!urlChatId || currentChatId === urlChatId) return;

    // Check if chat exists in loaded chats
    const chatInState = chats.find(c => c.chat_id === urlChatId);

    if (chatInState) {
      // Chat exists in state, just set it as current
      dispatch({ type: 'SET_CURRENT_CHAT', payload: urlChatId });
      dispatch({ type: 'SET_MODEL', payload: chatInState.model || ModelName.ChatGPT });
    }
    // Only validate if not already validating for this chat ID
    else if (!pendingChatIds.current.has(urlChatId)) {
      pendingChatIds.current.add(urlChatId);

      const validateChat = async () => {
        try {
          const response = await fetch(`/api/chat/validateChat?chatId=${urlChatId}`);
          const data = await response.json();

          if (!response.ok || !data.success) {
            // Always show error toasts
            let errorTitle = 'Unable to load conversation';
            let errorDesc = 'The requested conversation could not be found.';

            if (data.reason === 'DELETED') {
              errorDesc = 'This conversation has been deleted.';
            } else if (data.reason === 'UNAUTHORIZED') {
              errorDesc = 'You do not have permission to view this conversation.';
            }

            // Clear existing toasts before showing new one
            toast.dismiss();

            // Use timestamp to ensure uniqueness
            toast.error(errorTitle, {
              description: errorDesc,
              duration: 5000,
              id: `chat-error-${urlChatId}-${Date.now()}`
            });

            // Redirect to home
            router.push('/');
          } else {
            // If valid but not in state yet, refresh chats
            refreshChats();
          }
        } catch (error) {
          toast.dismiss();

          toast.error('Error loading conversation', {
            description: 'Please try again or start a new chat.',
            duration: 5000,
            id: `chat-error-generic-${Date.now()}`
          });

          router.push('/');
        } finally {
          // Remove from pending after a short delay
          setTimeout(() => {
            pendingChatIds.current.delete(urlChatId);
          }, 1000);
        }
      };

      validateChat();
    }
  }, [chats, currentChatId, dispatch, router, refreshChats]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      pendingChatIds.current.clear();
    };
  }, []);

  const currentChat = React.useMemo(() =>
    chats.find((chat) => chat.chat_id === currentChatId),
    [chats, currentChatId]
  );

  useVisibilityEffect();

  // Initialize credits
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await fetch('/api/chat/getUserCredits');
        const data = await response.json();
        if (data.success) {
          dispatch({ type: 'SET_CREDITS', payload: data.credits_remaining });
        }
      } catch (error) {
        logger.error('Failed to fetch credits:', error);
      }
    };
    fetchCredits();
  }, []);

  // Focus input when current chat changes
  useEffect(() => {
    if (actions.inputRef?.current && currentChatId) {
      // Use a short timeout to ensure the DOM has updated
      setTimeout(() => {
        actions.inputRef.current?.focus();
      }, 100);
    }
  }, [currentChatId, actions.inputRef]);

  const processMessages = React.useCallback((chat: any) => {
    if (!chat) return [];

    const messages = chat.chat_history || [];
    logger.debug('Processing messages:', {
      chatId: chat.chat_id,
      messageCount: messages.length
    });

    return messages
      .filter((msg: { user_input: any; api_response: any; }) => !!msg?.user_input || !!msg?.api_response)
      .map((msg: any) => ({
        id: msg.history_id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userInput: msg.user_input || '',
        apiResponse: msg.api_response || '',
        timestamp: msg.timestamp,
        model: msg.model || '',
        creditsDeducted: msg.credits_deducted || '0',
        inputType: msg.input_type || 'text',
        outputType: msg.output_type || 'text',
        contextId: msg.context_id || '',
        tokensUsed: msg.tokens_used || '0',
        brainstormMessages: msg.brainstorm_messages || []
      }));
  }, []);

  // Process the messages for the current chat
  const chatMessages = React.useMemo(() => {
    return processMessages(currentChat);
  }, [currentChat, processMessages]);

  // Toggle sidebar for mobile view
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = window.innerWidth < 640;
      setIsMobile(isMobileView);
    };

    // Initial check
    checkMobile();

    // Add event listener
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="bg-white flex h-screen overflow-hidden">
      {/* Mobile overlay - only shown on mobile when sidebar is open */}
      {isMobile && (
        <div
          className={`fixed inset-0 bg-black/20 z-20 sm:hidden mobile-overlay-transition ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={toggleSidebar}
        />
      )}

      {/* Flexible container for sidebar and main content */}
      <div className="flex w-full h-full">
        {/* Sidebar - fixed on mobile, part of the flex layout on desktop */}
        <aside
          className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
            fixed sm:relative z-30 
            w-[85%] max-w-xs sm:max-w-none sm:w-1/3 md:w-1/4 lg:w-1/5 h-full flex-shrink-0
            ${!sidebarOpen ? 'sm:hidden' : ''}
            ${isMobile ? 'sidebar-transition' : ''}
          `}
        >
          <Sidebar
            chatSessions={chats.map(chat => ({ ...chat, model: chat.model || ModelName.ChatGPT }))}
            currentChatId={currentChatId}
            setCurrentChatId={(chatId) => {
              actions.handleSelectChat(chatId);
              if (isMobile) {
                setSidebarOpen(false);
              }
            }}
            handleStartNewChat={actions.handleStartNewChat}
            handleEditChat={actions.handleEditChat}
            handleDeleteChat={actions.handleDeleteChat}
            credits={credits}
            setSelectedModel={(model) => dispatch({ type: 'SET_MODEL', payload: model })}
            inputRef={actions.inputRef}
            refreshChats={refreshChats}
          />

          {/* Close button for mobile */}
          {isMobile && (
            <button
              className="absolute top-4 right-4 sm:hidden p-1 rounded-full bg-gray-200 hover:bg-gray-300"
              onClick={toggleSidebar}
              aria-label="Close sidebar"
            >
              <XIcon className="w-5 h-5" />
            </button>
          )}
        </aside>

        {/* Main content - always takes remaining space */}
        <main
          className={`flex-1 h-full flex flex-col min-w-0 ${!sidebarOpen ? 'sm:w-full' : ''}`}
        >
          {/* Header */}
          <header className="w-full h-[73px] bg-white border-b border-solid z-10">
            <div className="flex items-center h-full px-2 sm:px-4 w-full">
              {/* Sidebar toggle button */}
              <button
                className="
                  mr-3 p-2 rounded-md flex items-center justify-center
                  hover:bg-gray-100 text-gray-600 active:bg-gray-200
                  transition-colors duration-200
                "
                onClick={toggleSidebar}
                aria-label="Toggle sidebar"
              >
                <PanelLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Chat header with existing functionality - full width */}
              <div className="flex-1">
                <ChatHeader
                  selectedModel={selectedModel}
                  setSelectedModel={(model) => dispatch({ type: 'SET_MODEL', payload: model })}
                />
              </div>
            </div>
          </header>

          {/* Chat content */}
          <ScrollArea className="flex-1">
            <ChatContainer
              chatId={currentChatId || ''}
            />
          </ScrollArea>

          {/* Message input */}
          <div className="w-full px-6 sm:px-10 md:px-16 lg:px-20 py-4">
            <ChatInput
              onSendMessage={actions.handleSendMessage}
              isLoading={isLoading}
              hasCredits={!!credits}
              inputRef={actions.inputRef}
              currentChatId={currentChatId}
            />
          </div>
        </main>
      </div>
    </div>
  );
};
