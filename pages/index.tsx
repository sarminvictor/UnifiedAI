import React, { useState, useEffect, useRef } from 'react';
import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';

interface ChatSession {
  chat_id: string;
  chat_title?: string;
  chat_history?: {
    user_input: string;
    api_response: string;
    input_type: string;
    output_type: string;
    timestamp: string;
    context_id: string;
  }[];
  id: string;
  name?: string;
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

interface Props {
  items: any[];
}

const HomeContent = (props: Props) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedModel, setSelectedModel] = useState('ChatGPT');
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [newChatName, setNewChatName] = useState('');
  const [chatNameError, setChatNameError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuVisible &&
        menuRefs.current[menuVisible] &&
        !menuRefs.current[menuVisible]?.contains(event.target as Node)
      ) {
        setMenuVisible(null);
        if (editingChatId) {
          const chat = chatSessions.find((chat) => chat.id === editingChatId);
          if (chat) {
            setNewChatName(chat.name || '');
          }
          setEditingChatId(null);
          setChatNameError(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuVisible, editingChatId, chatSessions]);

  useEffect(() => {
    window.addEventListener('beforeunload', saveChatsToDB);
    return () => {
      window.removeEventListener('beforeunload', saveChatsToDB);
    };
  }, [chatSessions]);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch('/api/getChats');
        const data = await response.json();
        if (data.success) {
          // Initialize arrays for each chat
          const chatsWithArrays = data.data.activeChats.map((chat: { messages: any; chat_history: any; }) => ({
            ...chat,
            messages: Array.isArray(chat.messages) ? chat.messages : [],
            chat_history: Array.isArray(chat.chat_history)
            ? chat.chat_history.map((h) => typeof h === "string" ? { 
                user_input: h, 
                api_response: "", 
                input_type: "Text", 
                output_type: "Text", 
                timestamp: new Date().toISOString(),
                context_id: "" 
              } : h)
            : [],
          })).sort((a: { updated_at: Date; }, b: { updated_at: Date; }) => {
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          }); // Sort by updated_at
        
          setChatSessions(chatsWithArrays);
        } else {
          console.error('Error fetching chats:', data.message);
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
        setChatSessions([]); // Fallback to an empty array on error
      }
    };

    fetchChats();
  }, []);

  const handleStartNewChat = () => {
    // Clean up any existing empty chats first
    setChatSessions(prev => prev.filter(chat => 
      chat.messages?.length > 0 || (chat.chat_history?.length ?? 0) > 0
    ));

    const newChatId = Date.now().toString();
    // Only update local state, don't save to DB
    setChatSessions(prevSessions => [{
      id: newChatId,
      chat_id: newChatId,
      chat_title: 'New Chat',
      messages: [],
      model: 'ChatGPT',
      name: '',
      updated_at: new Date().toISOString()
    }, ...prevSessions.filter(chat => 
      chat.messages?.length > 0 || (chat.chat_history?.length ?? 0) > 0
    )]);
    
    setCurrentChatId(newChatId);
    setSelectedModel('ChatGPT');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleSendMessage = async () => {
    if (input.trim()) {
      let chatId = currentChatId;
      let isNewChat = false;

      if (!chatId) {
        chatId = Date.now().toString();
        isNewChat = true;
        const newChat = {
          id: chatId,
          chat_id: chatId,
          chat_title: 'New Chat',
          name: 'New Chat',
          messages: [],
          chat_history: [],
          model: selectedModel,
          user_id: session?.user?.id || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted: false,
        };

        setChatSessions(prevChats => [newChat, ...prevChats]);
        setCurrentChatId(chatId);
      }

      const newMessage = {
        userInput: input.trim(),
        apiResponse: '',
        inputType: 'Text',
        outputType: 'Text',
        timestamp: new Date().toISOString(),
        contextId: '',
        user_input: input.trim(),
      };

      // Update local state first
      setChatSessions((prevChats) =>
        prevChats.map(chat =>
          chat.chat_id === chatId
            ? {
                ...chat,
                messages: [...(chat.messages || []), newMessage],
                chat_history: [
                  ...(chat.chat_history || []),
                  {
                    user_input: newMessage.userInput,
                    api_response: newMessage.apiResponse,
                    input_type: newMessage.inputType,
                    output_type: newMessage.outputType,
                    timestamp: newMessage.timestamp,
                    context_id: newMessage.contextId
                  }
                ],
                updated_at: new Date().toISOString(),
              }
            : chat
        ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      );

      setInput('');

      try {
        // If it's a new chat, save the chat first
        if (isNewChat) {
          await fetch('/api/saveChats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              chats: [{
                chat_id: chatId,
                chat_title: 'New Chat',
                user_id: session?.user?.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                deleted: false,
              }] 
            }),
          });
        }

        // Then save the message
        const response = await fetch('/api/saveMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, message: newMessage }),
        });

        if (!response.ok) {
          throw new Error('Failed to save message');
        }
      } catch (error) {
        console.error('Error saving message:', error);
      }
    }
  };

  const handleSelectChat = (chatId: string) => {
    if (
      currentChatId &&
      chatSessions &&
      chatSessions.length > 0 &&
      chatSessions.find((chat) => chat.id === currentChatId)?.messages
        .length === 0 &&
      currentChatId !== chatId
    ) {
      setChatSessions(chatSessions.filter((chat) => chat.id !== currentChatId));
    }
    setCurrentChatId(chatId);
    const selectedChat = chatSessions?.find((chat) => chat.id === chatId);
    if (selectedChat) {
      setSelectedModel(selectedChat.model);
    }
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleEditChat = (chatId: string) => {
    setEditingChatId(chatId);
    const chat = chatSessions.find((chat) => chat.chat_id === chatId);
    if (chat) {
      setNewChatName(chat.chat_title || 'Untitled Chat'); // Use chat_title instead of name
      setTimeout(() => {
        editInputRef.current?.focus();
      }, 0);
    }
    setMenuVisible(null);
  };

  const handleSaveChatName = async (chatId: string) => {
    if (newChatName.trim() === '') {
      setChatNameError(true);
      return;
    }

    try {
      const response = await fetch('/api/saveChat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          chatId, 
          chatTitle: newChatName 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save chat name');
      }

      setChatSessions(prevSessions =>
        prevSessions
          .map(chat =>
            chat.chat_id === chatId
              ? { ...chat, chat_title: newChatName, name: newChatName, updated_at: new Date().toISOString() }
              : chat
          )
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()) // Sort by updated_at
      );
      
      setEditingChatId(null);
      setChatNameError(false);
    } catch (error) {
      console.error('Error saving chat name:', error);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const response = await fetch('/api/deleteChat', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }

// Update local state after successful deletion
setChatSessions(prevSessions => 
  prevSessions
    .filter(chat => chat.chat_id !== chatId) // Remove the deleted chat
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()) // Ensure sorting is maintained
);

      
      if (currentChatId === chatId) {
        setCurrentChatId(null);
      }
      setMenuVisible(null);
    } catch (error) {
      console.error('Error deleting chat:', error);
      // Optionally show error to user
    }
  };

  const toggleMenu = (chatId: string) => {
    setMenuVisible(menuVisible === chatId ? null : chatId);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (editingChatId) {
        handleSaveChatName(editingChatId);
      } else if (currentChatId && input.trim()) {
        handleSendMessage();
      }
    }
  };

  const saveChatsToDB = async () => {
    // Only save chats that have messages
    const chatsToSave = chatSessions
      .filter(chat => (chat.messages?.length ?? 0) > 0 || (chat.chat_history?.length ?? 0) > 0)
      .map(chat => ({
        ...chat,
        messages: [], // Don't save messages here, they're already saved by saveMessage
        chat_history: [] // Don't save history here
      }));
    
    if (chatsToSave.length > 0) {
      await fetch('/api/saveChats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chats: chatsToSave }),
      });
    }
  };

  const currentChat = chatSessions?.find(
    (chat) => chat.chat_id === currentChatId
  );

  const renderMessages = () => {
    if (!currentChat) return <div className="text-gray-500">Select a chat to view messages</div>;
    
    // Combine and deduplicate messages from both arrays
    const allMessages = [
      ...(currentChat.messages || []).map(msg => ({
        ...msg,
        userInput: msg.userInput, 
        apiResponse: msg.apiResponse,
      })),
      ...(currentChat.chat_history || []).map(msg => ({
        ...msg,
        userInput: msg.user_input, // Normalize to `userInput`
        apiResponse: msg.api_response, // Normalize to `apiResponse`
        inputType: msg.input_type,
        outputType: msg.output_type,
        contextId: msg.context_id,
      }))
    ].filter((msg, index, self) => 
      index === self.findIndex(m => 
        m.timestamp === msg.timestamp
      )
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    
    if (allMessages.length === 0) {
      return <div className="text-gray-500">No messages in this chat</div>;
    }
  
    return allMessages.map((message, index) => {
      const normalizedMessage = {
        userInput: (message as any).userInput ?? (message as any).user_input,
        apiResponse: (message as any).apiResponse ?? (message as any).api_response,
        timestamp: message.timestamp,
      };
    
      return (
        <div key={normalizedMessage.timestamp} className="mb-4 p-4 bg-gray-200 rounded">
          <p className="mb-2">{normalizedMessage.userInput}</p>
          {normalizedMessage.apiResponse && <p>{normalizedMessage.apiResponse}</p>}
        </div>
      );
    });    
  };

  return (
    <div className="flex h-screen">
      {/* Dashboard Left Panel */}
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
          <ul>
            {(chatSessions || []).map((chat) => (
              <li
                key={chat.chat_id}
                className={`mb-2 p-2 rounded shadow flex justify-between items-center ${
                  currentChatId === chat.chat_id
                    ? 'bg-blue-100 border-l-4 border-blue-500' // Highlight active chat
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                {editingChatId === chat.chat_id ? (
                  <div className="flex flex-col w-full">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={newChatName}
                      onChange={(e) => setNewChatName(e.target.value)}
                      onBlur={() => handleSaveChatName(chat.chat_id)}
                      onKeyDown={handleKeyDown}
                      className={`truncate w-full text-left p-1 border rounded ${
                        chatNameError ? 'border-red-500' : ''
                      }`}
                    />
                    {chatNameError && (
                      <span className="text-red-500 text-sm">
                        Chat name cannot be empty
                      </span>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleSelectChat(chat.chat_id)}
                    className={`truncate w-full text-left pr-8 ${
                      currentChatId === chat.chat_id
                        ? 'font-medium text-blue-700' // Active chat text styling
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    {chat.chat_title || 'Untitled Chat'}
                  </button>
                )}
                {/* Modify the menu button to be disabled for unsaved chats */}
                <div
                  className="relative"
                  ref={(el) => {
                    menuRefs.current[chat.chat_id] = el;
                  }}
                >
                  <button
                    className={`text-gray-500 ${
                      chat.messages?.length === 0 && chat.chat_history?.length === 0
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:text-gray-700'
                    }`}
                    onClick={() => {
                      // Only toggle menu if chat has messages
                      if (chat.messages?.length > 0 || (chat.chat_history?.length ?? 0) > 0) {
                        toggleMenu(chat.chat_id);
                      }
                    }}
                    disabled={chat.messages?.length === 0 && chat.chat_history?.length === 0}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6v.01M12 12v.01M12 18v.01"
                      ></path>
                    </svg>
                  </button>
                  {menuVisible === chat.chat_id && 
                   (chat.messages?.length > 0 || (chat.chat_history?.length ?? 0) > 0) && (
                    <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow-lg z-10">
                      <button
                        onClick={() => handleEditChat(chat.chat_id)}
                        className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteChat(chat.chat_id)}
                        className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-gray-600">Logged in as:</p>
            <p className="text-sm font-semibold">{session?.user?.email}</p>
          </div>
          <button
            className="w-full bg-red-500 text-white py-2 rounded mt-4 hover:bg-red-600 transition"
            onClick={() => signOut()}
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="w-3/4 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">{selectedModel} Model</h2>
          <div>
            <button
              className={`px-4 py-2 rounded mr-2 transition ${selectedModel === 'ChatGPT' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              onClick={() => setSelectedModel('ChatGPT')}
            >
              ChatGPT
            </button>
            <button
              className={`px-4 py-2 rounded mr-2 transition ${selectedModel === 'Gemini' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              onClick={() => setSelectedModel('Gemini')}
            >
              Gemini
            </button>
            <button
              className={`px-4 py-2 rounded mr-2 transition ${selectedModel === 'Claude' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              onClick={() => setSelectedModel('Claude')}
            >
              Claude
            </button>
            <button
              className={`px-4 py-2 rounded transition ${selectedModel === 'DeepSeek' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              onClick={() => setSelectedModel('DeepSeek')}
            >
              DeepSeek
            </button>
          </div>
        </div>
        <div className="flex-grow p-4 overflow-y-auto">
          {renderMessages()}
        </div>
        <div className="p-4 border-t">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            ref={inputRef}
            className="w-full p-2 border rounded mb-2"
            placeholder="Type a message..."
            disabled={!currentChatId}
          />
          <button
            className={`w-full py-2 rounded transition ${input.trim() ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            onClick={handleSendMessage}
            disabled={!input.trim() || !currentChatId}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  return (
    <SessionProvider>
      <HomeContent items={[]} />
    </SessionProvider>
  );
}

// Types can stay at the root level
type User = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

// Remove or move these into the component where needed
// const { data: session } = useSession(); // Remove this line
// const someFunction = (param: string) => { ... }
// const someString: string | null = null;
// ...remove other unused code...