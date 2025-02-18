import React from 'react';

interface ChatInputProps {
  onSendMessage: ((message: string) => void) | undefined;
  isLoading: boolean;
  hasCredits: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  currentChatId: string | null; // ✅ Add currentChatId prop
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, hasCredits, inputRef, currentChatId }) => {
  const [input, setInput] = React.useState("");

  // Reset input when chat changes or is removed
  React.useEffect(() => {
    setInput("");
    if (currentChatId && inputRef.current) {
      inputRef.current.focus();
    } else if (!currentChatId && inputRef.current) {
      inputRef.current.blur();
    }
  }, [currentChatId]);

  const handleSend = () => {
    if (input.trim() && hasCredits && onSendMessage && currentChatId) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const getPlaceholder = () => {
    if (!currentChatId) return "Select a chat to start...";
    if (!hasCredits) return "No credits left!";
    return "Type a message...";
  };

  return (
    <div className="p-4 border-t">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        ref={inputRef}
        className="w-full p-2 border rounded mb-2"
        placeholder={getPlaceholder()}
        disabled={isLoading || !hasCredits || !currentChatId} // ✅ Fully disabled when no chat selected
      />
      <button
        className={`w-full py-2 rounded transition ${
          isLoading || !input.trim() || !hasCredits || !currentChatId
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-500 text-white hover:bg-blue-600"
        }`}
        onClick={handleSend}
        disabled={isLoading || !input.trim() || !hasCredits || !currentChatId} // ✅ Button is now fully disabled
      >
        {!currentChatId ? "Select a chat" : hasCredits ? (isLoading ? "Loading..." : "Send") : "Buy More Credits"}
      </button>
    </div>
  );
};

export default ChatInput;
