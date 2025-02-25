'use client';

import React, { useEffect, useRef } from 'react';
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

export const MainContent = () => {
  const { chats, currentChatId, selectedModel, isLoading, credits, dispatch } = useChatStore();
  const { error, mutate: refreshChats } = useChats();
  const actions = useChatActions();
  const router = useRouter();
  
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
      dispatch({ type: 'SET_MODEL', payload: chatInState.model || 'ChatGPT' });
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

  useEffect(() => {
    if (actions.inputRef?.current && currentChatId) {
      actions.inputRef.current.focus();
    }
  }, [currentChatId]);

  const processMessages = React.useCallback((chat: any) => {
    if (!chat) return [];
    
    const messages = chat.chat_history || [];
    logger.debug('Processing messages:', {
      chatId: chat.chat_id,
      messageCount: messages.length
    });
    
    return messages
      .filter(msg => !!msg?.user_input || !!msg?.api_response)
      .map(msg => ({
        userInput: msg.user_input || '',
        apiResponse: msg.api_response || '',
        timestamp: msg.timestamp,
        model: msg.model || '',
        creditsDeducted: msg.credits_deducted || '0'
      }));
  }, []);

  return (
    <div className="flex h-screen">
      <Sidebar
        chatSessions={chats}
        currentChatId={currentChatId}
        setCurrentChatId={actions.handleSelectChat}
        handleStartNewChat={actions.handleStartNewChat}
        handleEditChat={actions.handleEditChat}
        handleDeleteChat={actions.handleDeleteChat}
        credits={credits}
        setSelectedModel={(model) => dispatch({ type: 'SET_MODEL', payload: model })}
        inputRef={actions.inputRef}
        refreshChats={refreshChats}
      />
      <div className="w-3/4 flex flex-col">
        <ChatHeader 
          selectedModel={selectedModel} 
          setSelectedModel={(model) => dispatch({ type: 'SET_MODEL', payload: model })}
        />
        <ChatContainer 
          chatMessages={processMessages(currentChat)}
          isLoading={isLoading} 
        />
        <ChatInput 
          onSendMessage={actions.handleSendMessage}
          isLoading={isLoading}
          hasCredits={!!credits}
          inputRef={actions.inputRef}
          currentChatId={currentChatId}
        />
      </div>
    </div>
  );
};
