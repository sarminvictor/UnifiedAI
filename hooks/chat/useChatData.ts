'use client';

import { useEffect } from 'react';
import useSWR from "swr";
import { useChat } from './useChat';  // Updated import path
import { useChatStore } from '@/store/chat/chatStore';
import type { ApiResponse, ChatApiResponse, ChatSession } from "@/types/store";

const getChats = async () => {
  const response = await fetch("/api/chat/getChats");
  return response.json();
};

export const useChatData = () => {
  const { data: chatsData, mutate: refreshChats } = useSWR<ApiResponse<ChatApiResponse>>(
    "/api/chat/getChats",
    getChats,
    {
      onSuccess(data) {
        console.log("✅ Fetched Chats from API:", data);
      },
      onError(err) {
        console.error("❌ Error Fetching Chats:", err);
      },
    }
  );

  const chatSessions: ChatSession[] = chatsData?.data?.activeChats || [];

  return {
    chatSessions,
    refreshChats,
    isLoading: !chatsData,
  };
};
