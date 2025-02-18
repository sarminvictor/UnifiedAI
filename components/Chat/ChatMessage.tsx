import React from "react";

interface Message {
  userInput: string;
  apiResponse: string;
  model?: string;
  creditsDeducted?: number | { toString: () => string };
  timestamp: string;
}

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUserMessage = !!message.userInput;

  // Handle creditsDeducted which might be a Decimal from Prisma
  const formatCredits = (credits: number | { toString: () => string } | undefined) => {
    if (!credits) return "0.00";
    const creditValue = typeof credits === 'number' ? credits : parseFloat(credits.toString());
    return (Math.ceil(creditValue * 100) / 100).toFixed(2);
  };

  return (
    <div
      className={`mb-4 flex ${isUserMessage ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`p-3 rounded-lg max-w-md ${
          isUserMessage ? "bg-gray-300 text-black" : "bg-transparent text-gray-800"
        }`}
      >
        {message.userInput && <p>{message.userInput}</p>}
        {message.apiResponse && <p>{message.apiResponse}</p>}

        {/* Show model and credits info for AI messages */}
        {!isUserMessage && message.model && message.creditsDeducted !== undefined && (
          <p className="text-xs text-gray-500 mt-1 text-right">
            Model: {message.model} | Credits: {formatCredits(message.creditsDeducted)}
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
