'use client';

import React from "react";
import { useChatStore } from '@/store/chat/chatStore';
import ChatItem from "./ChatItem";

interface ChatListProps {
  chatSessions: Array<{
    chat_id: string;
    chat_title?: string;
    chat_history: Array<{
      user_input?: string;
      api_response?: string;
      timestamp: string;
    }>;
    model?: string;
    updated_at: string;
  }>;
  currentChatId: string | null;
  setCurrentChatId: (chatId: string) => void;
  handleEditChat: (chatId: string, newName: string) => void;
  handleDeleteChat: (chatId: string) => void;
  id?: string;
}

const ChatList: React.FC<ChatListProps> = ({
  chatSessions,
  currentChatId,
  setCurrentChatId,
  handleEditChat,
  handleDeleteChat,
  id,
}) => {
  return (
    <ul id={id} className="space-y-2">
      {chatSessions.map((chat) => (
        <ChatItem
          key={`chat-${chat.chat_id}`}
          chat={chat}
          currentChatId={currentChatId}
          setCurrentChatId={setCurrentChatId}
          handleEditChat={handleEditChat}
          handleDeleteChat={handleDeleteChat}
        />
      ))}
    </ul>
  );
};

export default ChatList;