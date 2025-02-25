'use client';

import React, { useEffect, useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation"; // Changed from next/router
import ChatList from "./ChatList";
import { useChatStore } from '@/store/chat/chatStore';

interface ChatSession {
  chat_id: string;
  chat_title?: string;
  chat_history: Array<{
    user_input?: string;
    api_response?: string;
    timestamp: string;
    model?: string;
    credits_deducted?: string;
  }>;
  model: string;
  updated_at: string;
}

interface SidebarProps {
  chatSessions: ChatSession[];
  currentChatId: string | null;
  setCurrentChatId: (chatId: string) => void;
  handleStartNewChat: () => void;
  handleEditChat: (chatId: string, newName: string) => void;
  handleDeleteChat: (chatId: string) => void;
  credits: number | null;
  setSelectedModel: (model: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  refreshChats: () => Promise<void>;
}

const Sidebar: React.FC<SidebarProps> = ({
  chatSessions,
  currentChatId,
  setCurrentChatId,
  handleStartNewChat,
  handleEditChat,
  handleDeleteChat,
  credits,
  setSelectedModel,
  inputRef,
  refreshChats,
}) => {
  const { data: session } = useSession();
  const router = useRouter(); // Now using App Router

  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleClickOutside = (event: MouseEvent) => {
    if (!menuVisible) return;
    const clickedInsideMenu = menuRefs.current[menuVisible]?.contains(event.target as Node);
    const clickedInsideChatList = document.getElementById("chat-list")?.contains(event.target as Node);

    if (!clickedInsideMenu && !clickedInsideChatList) {
      setMenuVisible(null);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuVisible]);

  const handleSelectChat = async (chatId: string) => {
    if (!chatId) return;

    setMenuVisible(null);
    setCurrentChatId(chatId);

    const selectedChat = chatSessions.find((chat) => chat.chat_id === chatId);
    if (selectedChat) {
      setSelectedModel(selectedChat.model || "ChatGPT");
    }

    setTimeout(() => inputRef.current?.focus(), 10);
    await refreshChats();
  };

  return (
    <div className="w-1/4 bg-gray-100 p-4 flex flex-col justify-between">
      <div>
        <h2 className="text-xl font-bold mb-4">Dashboard</h2>
        <button
          className="w-full bg-blue-500 text-white py-2 rounded mb-4 hover:bg-blue-600 transition"
          onClick={() => {
            setMenuVisible(null);
            handleStartNewChat();
          }}
        >
          Start New Chat
        </button>
        <h3 className="text-lg font-semibold mb-2">History</h3>

        <ChatList
          chatSessions={chatSessions}
          currentChatId={currentChatId}
          setCurrentChatId={handleSelectChat}
          handleEditChat={handleEditChat}
          handleDeleteChat={handleDeleteChat}
          id="chat-list"
        />
      </div>

      <div className="border-t pt-4 mt-4">
        <p className="text-sm text-gray-600">Logged in as:</p>
        <p className="text-sm font-semibold">{session?.user?.email}</p>

        <button
          onClick={() => router.push("/subscribe")} // Using new router
          className="mt-2 text-lg font-semibold text-blue-600 hover:underline"
        >
          {credits !== null ? `${Number(credits).toFixed(2)} credits` : "Loading..."}
        </button>

        <button
          className="w-full bg-red-500 text-white py-2 rounded mt-4 hover:bg-red-600 transition"
          onClick={() => signOut()}
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
