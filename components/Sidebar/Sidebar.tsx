'use client';

import React, { useEffect, useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useChatStore } from '@/store/chat/chatStore';
import { ModelName } from '@/types/ai.types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { createPortal } from 'react-dom';
import {
  MessageSquareIcon,
  SparklesIcon,
  LogOutIcon,
  CheckIcon,
  XIcon,
  MoreVerticalIcon
} from 'lucide-react';

interface ChatSession {
  chat_id: string;
  chat_title?: string;
  chat_history: Array<{
    user_input?: string;
    api_response?: string;
    timestamp: string;
    model?: ModelName;
    credits_deducted?: string;
  }>;
  model: ModelName;
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
  setSelectedModel: (model: ModelName) => void;
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
  const router = useRouter();

  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [newChatName, setNewChatName] = useState<string>("");
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Focus rename input when renaming starts
  useEffect(() => {
    if (renamingChatId && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [renamingChatId]);

  const handleSelectChat = async (chatId: string) => {
    if (!chatId || renamingChatId) return;

    // If clicking on the current chat, just focus the input
    if (chatId === currentChatId) {
      setTimeout(() => inputRef.current?.focus(), 10);
      return;
    }

    setCurrentChatId(chatId);

    const selectedChat = chatSessions.find((chat) => chat.chat_id === chatId);
    if (selectedChat) {
      setSelectedModel(selectedChat.model || ModelName.ChatGPT);
    }

    setTimeout(() => inputRef.current?.focus(), 10);
    await refreshChats();
  };

  const startRenaming = (chatId: string, currentName: string = "") => {
    setRenamingChatId(chatId);
    setNewChatName(currentName);
  };

  const cancelRenaming = () => {
    setRenamingChatId(null);
    setNewChatName("");
  };

  const confirmRenaming = () => {
    if (renamingChatId && newChatName.trim()) {
      handleEditChat(renamingChatId, newChatName.trim());
      setRenamingChatId(null);
      setNewChatName("");
    }
  };

  const handleCreditsClick = () => {
    router.push('/subscriptions');
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  // State to track if we're in a browser environment for portal rendering
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    setIsBrowser(true);
  }, []);

  // Delete confirmation modal using portal
  const DeleteModal = () => {
    if (!deletingChatId || !isBrowser) return null;

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm mx-4">
          <h2 className="text-lg font-medium text-[#171717] mb-2">Delete Chat</h2>
          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to delete this chat? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeletingChatId(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (deletingChatId) {
                  handleDeleteChat(deletingChatId);
                  setDeletingChatId(null);
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      {/* Render delete modal using portal */}
      <DeleteModal />

      <div className="h-full flex flex-col bg-gray-100 border-r border-gray-200">
        {/* Dashboard header */}
        <div className="p-4">
          <header className="flex items-center justify-between mb-6">
            <h1 className="font-semibold text-lg sm:text-xl text-neutral-900">
              Dashboard
            </h1>
          </header>

          {/* New chat button */}
          <div
            className="relative w-full h-11 rounded-lg mb-6 cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={handleStartNewChat}
          >
            <div className="absolute top-1/2 -translate-y-1/2 left-3 w-7 h-7 rounded-full border border-solid flex items-center justify-center">
              <MessageSquareIcon className="w-4 h-4" />
            </div>
            <div className="absolute inset-y-0 left-11 right-3 flex items-center">
              <div className="font-medium text-zinc-700 text-sm">
                Start New Chat
              </div>
            </div>
          </div>
        </div>

        {/* History section */}
        <div className="p-4 pt-0 flex-1 overflow-hidden">
          <div className="flex flex-col gap-4 h-full">
            <h2 className="font-normal text-base sm:text-lg text-neutral-900">
              History
            </h2>

            <ScrollArea className="flex-1 h-full">
              <div className="flex flex-col gap-0.5 pb-2">
                {chatSessions.map((chat) => (
                  <div
                    key={chat.chat_id}
                    className={`rounded w-full h-11 overflow-visible relative 
                      ${chat.chat_id === currentChatId ? "bg-gray-300" :
                        openMenuId === chat.chat_id ? "bg-gray-200" : "hover:bg-gray-200"} 
                      transition-colors cursor-pointer`}
                    onClick={() => handleSelectChat(chat.chat_id)}
                  >
                    {renamingChatId === chat.chat_id ? (
                      <div className="absolute inset-0 flex items-center px-3 bg-white border rounded">
                        <Input
                          ref={renameInputRef}
                          value={newChatName}
                          onChange={(e) => setNewChatName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              confirmRenaming();
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelRenaming();
                            }
                          }}
                          className="h-7 text-sm border-none shadow-none focus-visible:ring-0"
                          placeholder="Enter chat name..."
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmRenaming();
                            }}
                            className="p-1 rounded-full hover:bg-gray-100"
                          >
                            <CheckIcon className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelRenaming();
                            }}
                            className="p-1 rounded-full hover:bg-gray-100"
                          >
                            <XIcon className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="absolute inset-y-0 left-3 right-8 flex items-center">
                          <div className="font-medium text-[#374151] text-sm truncate w-full">
                            {chat.chat_title || "New Chat"}
                          </div>
                        </div>
                        {/* Only show menu button if chat has messages */}
                        {chat.chat_history && chat.chat_history.length > 0 ? (
                          <DropdownMenu
                            open={openMenuId === chat.chat_id}
                            onOpenChange={(open) => {
                              setOpenMenuId(open ? chat.chat_id : null);
                            }}
                          >
                            <DropdownMenuTrigger asChild>
                              <div
                                className="absolute inset-y-0 right-2 flex items-center cursor-pointer z-10 chat-menu-button"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className={`w-6 h-6 flex items-center justify-center rounded-full ${chat.chat_id === currentChatId ? 'hover:bg-gray-500' : 'hover:bg-gray-300'}`}>
                                  <MoreVerticalIcon className="w-4 h-4 text-gray-600" />
                                </div>
                              </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-24 bg-white">
                              <DropdownMenuItem
                                className="cursor-pointer text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startRenaming(chat.chat_id, chat.chat_title);
                                }}
                              >
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer text-sm text-red-600 hover:bg-gray-100 focus:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  setTimeout(() => {
                                    setDeletingChatId(chat.chat_id);
                                  }, 100);
                                }}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Update plan section */}
        <div className="p-4 border border-t">
          <div
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-200 p-2 rounded-lg transition-colors"
            onClick={handleCreditsClick}
          >
            <div className="flex w-7 h-7 items-center justify-center rounded-full border border-solid">
              <SparklesIcon className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <div className="font-normal text-neutral-900 text-sm sm:text-base leading-tight">
                Update plan
              </div>
              <div className="font-normal text-neutral-900 text-xs sm:text-sm">
                {credits !== null ? `${credits.toFixed(2)} credits` : "Loading credits..."}
              </div>
            </div>
          </div>

          {/* User info and logout - visible on all breakpoints except large screens */}
          <div className="flex flex-col mt-4 lg:hidden">
            <Separator className="mb-4" />
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage
                    src={session?.user?.image || ""}
                    alt="User avatar"
                  />
                  <AvatarFallback>{session?.user?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div className="font-medium text-neutral-900 text-sm truncate min-w-0 flex-1">
                  {session?.user?.email || ""}
                </div>
              </div>
              <button
                onClick={handleLogout}
                aria-label="Logout"
                className="p-2 rounded-full hover:bg-gray-200 transition-colors flex-shrink-0 ml-2"
              >
                <LogOutIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
