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
import type { ChatMessageProps } from "@/components/Chat/ChatContainer"; // Add this import
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

  const credits = creditsData?.credits_remaining 
    ? Number(creditsData.credits_remaining) // Convert string to number
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

  const handleSelectChat = async (chatId: string) => {
    // First, clean up empty chats except the target chat
    const nonEmptyChats = chatSessions.filter(chat => 
      chat.messages.length > 0 || chat.chat_id === chatId
    );

    // Update chats list immediately to remove empty chats
    refreshChats((prev) => {
      if (!prev?.data) return prev;
      return {
        ...prev,
        data: { activeChats: nonEmptyChats }
      };
    }, false);

    // Don't fetch for empty/new chats
    const targetChat = nonEmptyChats.find(chat => chat.chat_id === chatId);
    if (!targetChat || targetChat.messages.length === 0) {
      setCurrentChatId(chatId);
      setSelectedModel(targetChat?.model || "ChatGPT");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      return;
    }

    try {
      // Only fetch complete chat data for existing chats with messages
      const response = await fetch(`/api/getChat?chatId=${chatId}`);
      const data = await response.json();

      if (!data.success) {
        console.error('Failed to fetch chat:', data.message);
        return;
      }

      // Update local state with complete chat data
      refreshChats((prev) => {
        if (!prev?.data) return prev;
        
        const updatedChats = prev.data.activeChats.map(chat => 
          chat.chat_id === chatId ? data.data : chat
        );

        return {
          ...prev,
          data: { activeChats: updatedChats }
        };
      }, false);

      setCurrentChatId(chatId);
      const selectedChat = data.data;
      if (selectedChat) {
        setSelectedModel(selectedChat.model || "ChatGPT");
      }

      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    } catch (error) {
      console.error('Error fetching chat:', error);
    }
  };

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || !credits || !currentChatId) return;

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

      // Update chat order optimistically
      refreshChats((prev) => {
        if (!prev?.data) return prev as ApiResponse<ChatApiResponse>;
        
        const updatedChats = [...prev.data.activeChats];
        const chatIndex = updatedChats.findIndex(chat => chat.chat_id === chatId);
        
        if (chatIndex > -1) {
          const chat = updatedChats[chatIndex];
          // Remove chat from current position
          updatedChats.splice(chatIndex, 1);
          // Add chat to the beginning with updated timestamp
          updatedChats.unshift({
            ...chat,
            messages: [...chat.messages, userMessage],
            updated_at: new Date().toISOString()
          });
        }

        return {
          ...prev,
          data: { activeChats: updatedChats }
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

      // Update chat order again after AI response
      refreshChats((prev) => {
        if (!prev?.data) return prev as ApiResponse<ChatApiResponse>;
        
        const updatedChats = [...prev.data.activeChats];
        const chatIndex = updatedChats.findIndex(chat => chat.chat_id === chatId);
        
        if (chatIndex > -1) {
          const chat = updatedChats[chatIndex];
          updatedChats.splice(chatIndex, 1);
          updatedChats.unshift({
            ...chat,
            messages: [...chat.messages, aiMessage],
            updated_at: new Date().toISOString()
          });
        }

        return {
          ...prev,
          data: { activeChats: updatedChats }
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

  // Add type conversion helper
  const convertChatMessage = (msg: ChatMessage): ChatMessageProps => ({
    ...msg,
    tokensUsed: msg.tokensUsed ? Number(msg.tokensUsed) : undefined,
    creditsDeducted: msg.creditsDeducted ? Number(msg.creditsDeducted) : undefined
  });

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
        credits={credits} // Now matches string | null type
        setSelectedModel={setSelectedModel}
        inputRef={inputRef}
        refreshChats={refreshChats}
      />
      <div className="w-3/4 flex flex-col">
        <ChatHeader selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
        <ChatContainer 
          chatMessages={currentChat?.messages.map(convertChatMessage) || []} 
          isLoading={isLoading} 
        />
        <ChatInput 
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          hasCredits={!!credits} // Convert to boolean
          inputRef={inputRef}
          currentChatId={currentChatId}
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
