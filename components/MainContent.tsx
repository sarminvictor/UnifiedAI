import React, { useEffect } from 'react';
import Sidebar from "@/components/Sidebar/Sidebar";
import ChatHeader from "@/components/Chat/ChatHeader";
import ChatContainer from "@/components/Chat/ChatContainer";
import ChatInput from "@/components/Chat/ChatInput";
import { convertChatMessage } from '@/utils/chatUtils';
import { useChatStore } from '@/store/chat/chatStore';
import { useChatActions } from '@/store/chat/chatActions';
import { useVisibilityEffect } from '@/hooks/useVisibilityEffect';
import { mutate } from 'swr';
import { useChats } from '@/hooks/useChats';

export const MainContent = () => {
  const state = useChatStore();
  const actions = useChatActions();
  const { error } = useChats();

  const currentChat = state.chats.find((chat) => chat.chat_id === state.currentChatId);

  useVisibilityEffect();

  // Initialize credits
  React.useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await fetch('/api/getUserCredits');
        const data = await response.json();
        if (data.success) {
          actions.dispatch({ type: 'SET_CREDITS', payload: data.credits_remaining });
        }
      } catch (error) {
        console.error('Failed to fetch credits:', error);
      }
    };
    fetchCredits();
  }, []);

  // Make sure inputRef exists before using
  React.useEffect(() => {
    if (actions.inputRef?.current && state.currentChatId) {
      actions.inputRef.current.focus();
    }
  }, [state.currentChatId]);

  return (
    <div className="flex h-screen">
      <Sidebar
        chatSessions={state.chats}
        currentChatId={state.currentChatId}
        setCurrentChatId={actions.handleSelectChat}
        handleStartNewChat={actions.handleStartNewChat}  // Fixed handler name
        handleEditChat={actions.handleEditChat}
        handleDeleteChat={actions.handleDeleteChat}
        credits={state.credits}
        setSelectedModel={(model) => actions.dispatch({ type: 'SET_MODEL', payload: model })}
        inputRef={actions.inputRef}
        refreshChats={(callback) => actions.dispatch({ type: 'SET_CHATS', payload: callback(state.chats) })}
      />
      <div className="w-3/4 flex flex-col">
        <ChatHeader 
          selectedModel={state.selectedModel} 
          setSelectedModel={(model) => actions.dispatch({ type: 'SET_MODEL', payload: model })}
        />
        <ChatContainer 
          chatMessages={(currentChat?.messages || []).map(convertChatMessage)} 
          isLoading={state.isLoading} 
        />
        <ChatInput 
          onSendMessage={actions.handleSendMessage}
          isLoading={state.isLoading}
          hasCredits={!!state.credits}
          inputRef={actions.inputRef}
          currentChatId={state.currentChatId}
        />
      </div>
    </div>
  );
};
