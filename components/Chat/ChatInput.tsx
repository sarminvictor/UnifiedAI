'use client';

import React from 'react';
import { useChatStore } from '@/store/chat/chatStore';
import { toast } from 'sonner';

interface ChatInputProps {
  onSendMessage: ((message: string) => void) | undefined;
  isLoading: boolean;
  hasCredits: boolean;
  inputRef: React.RefObject<HTMLInputElement> | null;
  currentChatId: string | null;
}

export default function ChatInput({ onSendMessage, isLoading, hasCredits, inputRef, currentChatId }: ChatInputProps) {
  const [input, setInput] = React.useState("");
  const localInputRef = React.useRef<HTMLInputElement>(null);
  const activeInputRef = inputRef || localInputRef;
  const previousLoadingState = React.useRef(isLoading);

  // Reset input when chat changes or is removed
  React.useEffect(() => {
    setInput("");
    if (currentChatId && activeInputRef?.current) {
      // Focus the input when switching to a chat
      setTimeout(() => {
        activeInputRef.current?.focus();
      }, 100);
    } else if (!currentChatId && activeInputRef?.current) {
      activeInputRef.current.blur();
    }
  }, [currentChatId, activeInputRef]);

  // Maintain focus after API responses
  React.useEffect(() => {
    // If loading state changes from true to false, it means the API response has completed
    if (previousLoadingState.current && !isLoading && currentChatId && activeInputRef?.current) {
      // Focus the input after a short delay to ensure the UI has updated
      setTimeout(() => {
        activeInputRef.current?.focus();
      }, 100);
    }

    // Update the previous loading state
    previousLoadingState.current = isLoading;
  }, [isLoading, currentChatId, activeInputRef]);

  const handleSend = async () => {
    if (!input.trim()) return;

    if (!hasCredits) {
      toast.error('Insufficient credits', {
        description: 'Please add more credits to continue using the service.',
        action: {
          label: 'Add Credits',
          onClick: () => window.location.href = '/user/credits'
        }
      });
      return;
    }

    if (!currentChatId) {
      toast.error('No active chat selected');
      return;
    }

    const message = input;
    setInput('');
    if (onSendMessage) {
      onSendMessage(message);
      // Focus the input after sending a message
      setTimeout(() => {
        activeInputRef.current?.focus();
      }, 100);
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
        autoFocus={!!currentChatId}
      />
      <button
        className={`w-full py-2 rounded transition ${isDisabled || !input.trim()
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
