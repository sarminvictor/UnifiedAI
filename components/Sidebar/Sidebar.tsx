import React, { useEffect, useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react"; // ✅ Import signOut here
import { useRouter } from "next/router";
import ChatList from "./ChatList";

interface ChatSession {
  chat_id: string;
  chat_title?: string;
  messages: {
    userInput: string;
    apiResponse: string;
    inputType: string;
    outputType: string;
    timestamp: string;
    contextId: string;
  }[];
  model: string;
  updated_at: string;
}

interface SidebarProps {
  chatSessions: ChatSession[]; // Update type from any[] to ChatSession[]
  currentChatId: string | null;
  setCurrentChatId: (chatId: string) => void;
  handleStartNewChat: () => void;
  handleEditChat: (chatId: string, newName: string) => void;  // ✅ Add this prop
  handleDeleteChat: (chatId: string) => void;
  credits: number | null;
  setSelectedModel: (model: string) => void; // ✅ Add setSelectedModel
  inputRef: React.RefObject<HTMLInputElement>; // ✅ Add inputRef
  refreshChats: (callback: (prev: any) => any, revalidate?: boolean) => void; // ✅ Add refreshChats
}

const Sidebar: React.FC<SidebarProps> = ({
  chatSessions,
  currentChatId,
  setCurrentChatId,
  handleStartNewChat,
  handleEditChat,  // ✅ Add this prop
  handleDeleteChat,
  credits,
  setSelectedModel, // ✅ Add setSelectedModel
  inputRef, // ✅ Add inputRef
  refreshChats, // ✅ Add refreshChats
}) => {

  const { data: session } = useSession();
  const router = useRouter();

  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [newChatName, setNewChatName] = useState("");
  const [chatNameError, setChatNameError] = useState(false);
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleClickOutside = (event: MouseEvent) => {
    if (!menuVisible) return;

    const clickedInsideMenu = menuRefs.current[menuVisible]?.contains(event.target as Node);
    const clickedInsideChatList = document.getElementById("chat-list")?.contains(event.target as Node);

    if (!clickedInsideMenu && !clickedInsideChatList) {
      setMenuVisible(null);

      if (editingChatId) {
        const chat = chatSessions.find((chat) => chat.chat_id === editingChatId);
        if (chat) {
          setNewChatName(chat.chat_title || "");
        }
        setEditingChatId(null);
        setChatNameError(false);
      }
    }
  };

  // ✅ FIXED: Only close chat if clicking **outside** of chat list and menu
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuVisible, editingChatId, chatSessions]);

  const handleSelectChat = (chatId: string) => {
    if (!chatId) return;

    setMenuVisible(null);
    setEditingChatId(null);
    setCurrentChatId(chatId);

    // Clean up empty chats immediately
    const updatedChats = chatSessions.filter((chat: ChatSession) => 
      chat.messages.length > 0 || chat.chat_id === chatId
    );

    // Update both local state and parent
    refreshChats((prev) => ({
      ...prev,
      data: { activeChats: updatedChats }
    }), false);

    const selectedChat = chatSessions.find((chat) => chat.chat_id === chatId);
    if (selectedChat) {
      setSelectedModel(selectedChat.model || "ChatGPT");
    }

    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  return (
    <div className="w-1/4 bg-gray-100 p-4 flex flex-col justify-between">
      <div>
        <h2 className="text-xl font-bold mb-4">Dashboard</h2>
        <button
          className="w-full bg-blue-500 text-white py-2 rounded mb-4 hover:bg-blue-600 transition"
          onClick={handleStartNewChat}
        >
          Start New Chat
        </button>
        <h3 className="text-lg font-semibold mb-2">History</h3>

        {/* Chat List Component */}
        <ChatList
          chatSessions={chatSessions}
          currentChatId={currentChatId}
          setCurrentChatId={setCurrentChatId}
          handleEditChat={handleEditChat}
          handleDeleteChat={handleDeleteChat}
          id="chat-list"  // ✅ FIXED: Added ID to ChatList
        />
      </div>

      <div>
        <div className="border-t pt-4 mt-4">
          <p className="text-sm text-gray-600">Logged in as:</p>
          <p className="text-sm font-semibold">{session?.user?.email}</p>

          {/* Display Credits */}
          <button
            onClick={() => router.push("/subscribe")}
            className="mt-2 text-lg font-semibold text-blue-600 hover:underline"
          >
            {credits !== null && credits !== undefined
              ? `${credits} credits`  // Credits are already formatted to 2 decimal places
              : "Loading..."}
          </button>

        </div>

        {/* ✅ Fix: Logout Button Works Now */}
        <button
          className="w-full bg-red-500 text-white py-2 rounded mt-4 hover:bg-red-600 transition"
          onClick={() => signOut()} // ✅ Properly calls signOut
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
