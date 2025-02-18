import React, { useState, useRef, useEffect } from "react";

interface ChatItemProps {
  chat: any;
  currentChatId: string | null;
  setCurrentChatId: (chatId: string) => void;
  handleEditChat: (chatId: string, newName: string) => void;
  handleDeleteChat: (chatId: string) => void;
}

const ChatItem: React.FC<ChatItemProps> = ({
  chat,
  currentChatId,
  setCurrentChatId,
  handleEditChat,
  handleDeleteChat,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newChatName, setNewChatName] = useState(chat.chat_title || "Untitled Chat");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isEmpty = chat.messages.length === 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuVisible && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuVisible]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (newChatName.trim() !== "") {
      handleEditChat(chat.chat_id, newChatName.trim());
      setIsEditing(false);
    }
  };

  return (
    <li
      key={chat.chat_id}
      className={`mb-2 p-2 rounded shadow flex justify-between items-center ${
        currentChatId === chat.chat_id ? "bg-blue-100 border-l-4 border-blue-500" : "bg-white hover:bg-gray-50"
      } ${isEmpty ? 'opacity-70' : ''}`}
    >
      {/* Edit Chat Name Input */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={newChatName}
          onChange={(e) => setNewChatName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          className="truncate w-full text-left p-1 border rounded"
        />
      ) : (
        <button
          className={`truncate w-full text-left pr-8 ${
            currentChatId === chat.chat_id ? "font-medium text-blue-700" : "text-gray-700 hover:text-gray-900"
          }`}
          onClick={() => setCurrentChatId(chat.chat_id)}
        >
          {isEmpty ? "New Chat" : (chat.chat_title || "Untitled Chat")}
        </button>
      )}

      {/* Only show menu for non-empty chats */}
      {!isEmpty && (
        <div className="relative">
          <button
            className={`text-gray-500 hover:text-gray-700 ${!chat.messages.length ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => chat.messages.length && setMenuVisible((prev) => !prev)} // Prevent opening menu for new chat
            disabled={!chat.messages.length}
          >
            ⋮
          </button>

          {menuVisible && chat.messages.length > 0 && ( // Only show menu for saved chats
            <div ref={menuRef} className="absolute right-0 mt-2 w-32 bg-white border rounded shadow-lg z-10">
              <button
                onClick={() => {
                  setIsEditing(true);
                  setMenuVisible(false);
                }}
                className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  handleDeleteChat(chat.chat_id);
                  setMenuVisible(false);
                }}
                className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
};

export default ChatItem;
