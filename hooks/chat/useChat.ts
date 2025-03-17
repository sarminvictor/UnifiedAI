'use client';

import { useChatStore } from '@/store/chat/chatStore';
import { useChatActions } from '@/store/chat/chatActions';
import { Chat } from '@/store/chat/types';
import useSWR from 'swr';
import { chatService } from '@/services/chatService';
import { ModelName } from '@/types/ai.types';

export const useChat = () => {
  const state = useChatStore();
  const actions = useChatActions();

  return {
    currentChatId: state.currentChatId,
    selectedModel: state.selectedModel,
    isLoading: state.isLoading,
    chatSessions: state.chats,
    currentChat: state.chats.find((chat: Chat) => chat.chat_id === state.currentChatId),
    inputRef: actions.inputRef,
    refreshChats: actions.dispatch,
    handlers: {
      setCurrentChatId: (id: string | null) => actions.dispatch({ type: 'SET_CURRENT_CHAT', payload: id }),
      setSelectedModel: (model: ModelName) => actions.dispatch({ type: 'SET_MODEL', payload: model }),
      setIsLoading: (loading: boolean) => actions.dispatch({ type: 'SET_LOADING', payload: loading }),
      ...actions
    }
  };
};
