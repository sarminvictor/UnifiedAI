import React from 'react';
import { useChatStore } from '@/store/chat/chatStore';

interface ChatInputProps {
  onSendMessage: ((message: string) => void) | undefined;
  isLoading: boolean;
  hasCredits: boolean;
  inputRef: React.RefObject<HTMLInputElement> | null;
  currentChatId: string | null;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, hasCredits, inputRef, currentChatId }) => {
  const [input, setInput] = React.useState("");
  const localInputRef = React.useRef<HTMLInputElement>(null);
  const activeInputRef = inputRef || localInputRef;

  // Reset input when chat changes or is removed
  React.useEffect(() => {
    setInput("");
    if (currentChatId && activeInputRef?.current) {
      activeInputRef.current.focus();
    } else if (!currentChatId && activeInputRef?.current) {
      activeInputRef.current.blur();
    }
  }, [currentChatId, activeInputRef]);

  const handleSend = () => {
    if (input.trim() && hasCredits && onSendMessage && currentChatId) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const getPlaceholder = () => {
    if (!currentChatId) return "Select a chat to start...";
    if (hasCredits === false) return "No credits left! Click credits to buy more.";
    if (hasCredits === undefined) return "Loading credits...";
    return "Type a message...";
  };

  const isDisabled = isLoading || !hasCredits || !currentChatId;
  const buttonText = !currentChatId 
    ? "Select a chat" 
    : !hasCredits 
    ? "Buy More Credits" 
    : isLoading 
    ? "Loading..." 
    : "Send";

  return (
    <div className="p-4 border-t">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !isDisabled && handleSend()}
        ref={activeInputRef}
        className="w-full p-2 border rounded mb-2"
        placeholder={getPlaceholder()}
        disabled={isDisabled}
      />
      <button
        className={`w-full py-2 rounded transition ${
          isDisabled || !input.trim()
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-500 text-white hover:bg-blue-600"
        }`}
        onClick={handleSend}
        disabled={isDisabled || !input.trim()}
      >
        {buttonText}
      </button>
    </div>
  );
};

export default ChatInput;
