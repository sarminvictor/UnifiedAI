import React, { useState, useRef, useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { 
  getChats, 
  getUserCredits, 
  sendMessage, 
  deleteChat, 
  createMessage,
  formatNumber,
  type ApiResponse, 
  type ChatApiResponse, 
  type CreditsApiResponse,
  type ChatMessage,
  type ChatSession
} from "@/utils/apiClient";
import Sidebar from "@/components/Sidebar/Sidebar";
import ChatHeader from "@/components/Chat/ChatHeader";
import ChatContainer from "@/components/Chat/ChatContainer";
import ChatInput from "@/components/Chat/ChatInput";
import { useChat } from '@/hooks/useChat';

// Update the formatter functions
const formatCredits = (credits: number): number => Number(credits.toFixed(2));
const formatTokens = (tokens: number | undefined): number | undefined => 
  tokens ? Math.round(tokens) : undefined;

const HomeContent = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const { data: chatsData, mutate: refreshChats } = useSWR<ApiResponse<ChatApiResponse>>(
    "/api/getChats",
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

  const { data: creditsData, mutate: refreshCredits } = useSWR<CreditsApiResponse>(
    "/api/getUserCredits",
    getUserCredits,
    {
      revalidateOnFocus: false,
      onSuccess(data) {
        console.log("✅ SWR Fetched Credits Data:", data);
      },
      onError(err) {
        console.error("❌ SWR Error Fetching Credits:", err);
      },
    }
  );

  const chatSessions: ChatSession[] = chatsData?.data?.activeChats || [];

  // Use the hook and extract all values
  const {
    currentChatId,
    setCurrentChatId,
    selectedModel,
    setSelectedModel,
    inputRef
  } = useChat(chatSessions);

  console.log("🛠️ Chat Sessions:", chatSessions);

  const credits = creditsData?.credits_remaining !== undefined 
    ? formatNumber.credits(Number(creditsData.credits_remaining))
    : null;

  console.log("💰 Current credits:", credits);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Add effect to clean up empty chats on tab switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Clean up empty chats and reset current chat if it was empty
        refreshChats((prev) => {
          if (!prev?.data) return prev;
          
          const nonEmptyChats = prev.data.activeChats.filter(chat => chat.messages.length > 0);
          
          // If current chat was empty or doesn't exist anymore, reset it
          if (currentChatId && !nonEmptyChats.some(chat => chat.chat_id === currentChatId)) {
            setCurrentChatId(null);
            // Force immediate UI update
            setTimeout(() => {
              inputRef.current?.blur();
            }, 0);
          }

          return {
            ...prev,
            data: { activeChats: nonEmptyChats }
          };
        }, true); // Set to true to ensure immediate revalidation
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentChatId]);

  // Add effect to check current chat validity
  useEffect(() => {
    if (currentChatId) {
      const chatExists = chatSessions.some(chat => 
        chat.chat_id === currentChatId && (chat.messages.length > 0 || chatSessions.indexOf(chat) === 0)
      );
      
      if (!chatExists) {
        setCurrentChatId(null);
        inputRef.current?.blur();
      }
    }
  }, [chatSessions, currentChatId]);

  const handleStartNewChat = () => {
    // Don't allow creating new chat if there's already an empty one
    const emptyChat = chatSessions.find(chat => chat.messages.length === 0);
    if (emptyChat) {
      setCurrentChatId(emptyChat.chat_id);
      setSelectedModel(emptyChat.model || "ChatGPT");
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    const DEFAULT_MODEL = "ChatGPT";
    const newChatId = Date.now().toString();

    // Only update local state, don't save to DB yet
    const newChat: ChatSession = {
      chat_id: newChatId,
      chat_title: "New Chat",
      messages: [],
      model: DEFAULT_MODEL,
      updated_at: new Date().toISOString(),
    };

    refreshChats((prev) => {
      if (!prev?.data) return prev as ApiResponse<ChatApiResponse>;
      return {
        ...prev,
        data: { 
          activeChats: [newChat, ...prev.data.activeChats.filter(chat => chat.messages.length > 0)] 
        }
      };
    }, false);

    setCurrentChatId(newChatId);
    setSelectedModel(DEFAULT_MODEL);
    // Fix focus timing
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelectChat = (chatId: string) => {
    // Remove any empty chats from current state
    const updatedChats = chatSessions.filter(chat => 
      chat.messages.length > 0 || chat.chat_id === chatId
    );

    // Update local state immediately
    if (chatsData?.data) {
      refreshChats({
        ...chatsData,
        data: { activeChats: updatedChats }
      }, false);
    }

    setCurrentChatId(chatId);
    const selectedChat = updatedChats.find((chat) => chat.chat_id === chatId);
    if (selectedChat) {
      setSelectedModel(selectedChat.model || "ChatGPT");
    }

    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || credits === 0 || !currentChatId) return;

    // Verify chat still exists and is not empty
    const currentChat = chatSessions.find(chat => chat.chat_id === currentChatId);
    if (!currentChat) {
      setCurrentChatId(null);
      return;
    }

    const chatId = currentChatId;
    const userMessage = createMessage.user(messageText, chatId);
    const isNewChat = !chatSessions.find(chat => 
      chat.chat_id === chatId && chat.messages.length > 0
    );

    setIsLoading(true);

    try {
      // For new chats, create in DB before sending message
      if (isNewChat) {
        const createResponse = await fetch("/api/saveChat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            chatId, 
            chatTitle: "New Chat"
          }),
        });

        if (!createResponse.ok) {
          throw new Error("Failed to create chat");
        }
      }

      console.log("🔹 Sending message:", { chatId, modelName: selectedModel });

      // Show optimistic update
      refreshChats((prev) => {
        if (!prev?.data) return prev as ApiResponse<ChatApiResponse>;
        return {
          ...prev,
          data: {
            activeChats: prev.data.activeChats.map((chat) =>
              chat.chat_id === chatId ? { ...chat, messages: [...chat.messages, userMessage] } : chat
            ),
          },
        };
      }, false);

      const response = await sendMessage({
        chatId,
        userMessage: messageText.trim(),
        modelName: selectedModel,
      });

      console.log("📨 API Response:", response);

      if (!response?.success) {
        throw new Error(response?.aiMessage?.api_response || "API request failed");
      }

      const aiMessage = createMessage.ai(response, chatId);

      // Update chat with AI response
      refreshChats((prev) => {
        if (!prev?.data) return prev as ApiResponse<ChatApiResponse>;
        return {
          ...prev,
          data: {
            activeChats: prev.data.activeChats.map((chat) =>
              chat.chat_id === chatId 
                ? { ...chat, messages: [...chat.messages, aiMessage] }
                : chat
            ),
          },
        };
      }, false);

      refreshCredits();
    } catch (err) {
      console.error("❌ Send Message Error:", err);
      const errorMessage = createMessage.error(err as Error, chatId);
      
      // Show error in chat
      refreshChats((prev) => {
        if (!prev?.data) return prev as ApiResponse<ChatApiResponse>;
        return {
          ...prev,
          data: {
            activeChats: prev.data.activeChats.map((chat) =>
              chat.chat_id === chatId ? { ...chat, messages: [...chat.messages, errorMessage] } : chat
            ),
          },
        };
      }, false);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    // Reset current chat if we're deleting the active one
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }

    refreshChats((prev) => {
      if (!prev?.data) return prev;
      return {
        ...prev,
        data: {
          activeChats: prev.data.activeChats.filter((chat) => chat.chat_id !== chatId),
        },
      };
    }, false);

    try {
      await deleteChat(chatId);
      refreshChats();
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  const handleEditChat = async (chatId: string, newName: string) => {
    if (!newName.trim()) return;

    refreshChats((prev) => {
      if (!prev?.data) return prev;
      return {
        ...prev,
        data: {
          activeChats: prev.data.activeChats.map((chat) =>
            chat.chat_id === chatId ? { ...chat, chat_title: newName } : chat
          ),
        },
      };
    }, false);

    try {
      await fetch("/api/saveChat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, chatTitle: newName }),
      });

      refreshChats();
    } catch (error) {
      console.error("Error saving chat name:", error);
      refreshChats();
    }
  };

  const currentChat = chatSessions.find((chat) => chat.chat_id === currentChatId);

  return (
    <div className="flex h-screen">
      <Sidebar
        chatSessions={chatSessions}
        currentChatId={currentChatId}
        setCurrentChatId={handleSelectChat}
        handleStartNewChat={handleStartNewChat}
        handleEditChat={handleEditChat}
        handleDeleteChat={handleDeleteChat}
        credits={credits}
        setSelectedModel={setSelectedModel} // ✅ Add setSelectedModel
        inputRef={inputRef} // ✅ Add inputRef
        refreshChats={refreshChats} // ✅ Add refreshChats
      />
      <div className="w-3/4 flex flex-col">
        <ChatHeader selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
        <ChatContainer chatMessages={currentChat?.messages || []} isLoading={isLoading} />
        <ChatInput 
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          hasCredits={credits !== 0}
          inputRef={inputRef}
          currentChatId={currentChatId} // ✅ Add currentChatId prop
        />
      </div>
    </div>
  );
};

export default function Home() {
  return (
    <SessionProvider>
      <HomeContent />
    </SessionProvider>
  );
}
