import { useState, useEffect } from 'react';
import axios from 'axios';

// Define the type for a chat object
interface Chat {
  chat_id: string;
  chat_title: string;
  // ...other properties if any
}

// Define the props for the component
interface ChatListProps {
  chats: Chat[];
  // ...other props if any
}

const ChatList: React.FC<ChatListProps> = ({ chats }) => {
  const [activeChats, setActiveChats] = useState<Chat[]>([]);
  const [deletedChats, setDeletedChats] = useState<Chat[]>([]);
  const [showTrashbin, setShowTrashbin] = useState(false);

  useEffect(() => {
    async function fetchChats() {
      try {
        const response = await axios.get('/api/getChats');
        if (response.data.success) {
          setActiveChats(response.data.data.activeChats);
          setDeletedChats(response.data.data.deletedChats);
        } else {
          console.error('Error fetching chats:', response.data.message);
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
      }
    }

    fetchChats();
  }, []);

  const handleDelete = async (chatId: string) => {
    try {
      await axios.delete('/api/deleteChat', { data: { chatId } });
      setDeletedChats(deletedChats.filter((chat) => chat.chat_id !== chatId));
      setActiveChats(activeChats.filter((chat) => chat.chat_id !== chatId));
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleRestore = async (chatId: string) => {
    try {
      await axios.post('/api/restoreChat', { chatId });
      const restoredChat = deletedChats.find((chat) => chat.chat_id === chatId);
      if (restoredChat) {
        setDeletedChats(deletedChats.filter((chat) => chat.chat_id !== chatId));
        setActiveChats([...activeChats, restoredChat]);
      }
    } catch (error) {
      console.error('Error restoring chat:', error);
    }
  };

  const handleSelectChat = (chatId: string) => {
    // ...existing code...
  };

  return (
    <div>
      <h2>Chat History</h2>
      <ul>
        {activeChats.map((chat) => (
          <li key={chat.chat_id}>
            <button onClick={() => handleSelectChat(chat.chat_id)}>
              {chat.chat_title || 'Untitled Chat'}
            </button>
          </li>
        ))}
      </ul>

      <h2 onClick={() => setShowTrashbin(!showTrashbin)}>Trashbin</h2>
      {showTrashbin && (
        <ul>
          {deletedChats.map((chat) => (
            <li key={chat.chat_id}>
              {chat.chat_title || 'Untitled Chat'}
              <button onClick={() => handleRestore(chat.chat_id)}>
                Restore
              </button>
              <button onClick={() => handleDelete(chat.chat_id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChatList;
