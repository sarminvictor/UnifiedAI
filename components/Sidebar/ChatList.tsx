import React from "react";
import { useChatStore } from '@/store/chat/chatStore';
import ChatItem from "./ChatItem";

interface ChatListProps {
  chatSessions: any[];
  currentChatId: string | null;
  setCurrentChatId: (chatId: string) => void;
  handleEditChat: (chatId: string, newName: string) => void;
  handleDeleteChat: (chatId: string) => void;
  id?: string; // ✅ Add id prop
}

const ChatList: React.FC<ChatListProps> = ({
  chatSessions,
  currentChatId,
  setCurrentChatId,
  handleEditChat,
  handleDeleteChat,
  id, // ✅ Add id prop
}) => {
  return (
    <ul id={id}>
      {chatSessions.map((chat) => (
        <ChatItem
          key={chat.chat_id}
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
