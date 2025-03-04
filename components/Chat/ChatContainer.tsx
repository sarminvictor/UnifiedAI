'use client';

import React, { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";
import { formatCredits } from '@/utils/format';

export interface ChatMessageProps {
  userInput: string;
  apiResponse: string;
  inputType: string;
  outputType: string;
  timestamp: string;
  contextId: string;
  model?: string;
  tokensUsed?: string;  // Changed back to string to match schema
  creditsDeducted?: string;
}

interface ChatContainerProps {
  chatMessages: ChatMessageProps[];
  isLoading?: boolean; // Add loading prop
}

const ChatContainer: React.FC<ChatContainerProps> = ({ chatMessages, isLoading }) => {
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Filter and transform messages if needed
  const validMessages = chatMessages?.filter(msg =>
    msg && (msg.userInput || msg.apiResponse)
  ) || [];

  return (
    <div className="flex-grow p-4 overflow-y-auto h-full bg-gray-100 rounded-lg shadow-inner">
      {!validMessages.length ? (
        <div className="text-center text-gray-500 mt-5">No messages yet.</div>
      ) : (
        <div className="flex flex-col space-y-4">
          {validMessages.map((msg, index) => (
            <React.Fragment key={`${msg.timestamp}-${index}`}>
              {msg.userInput && (
                <div className="flex justify-end">
                  <div className="bg-blue-500 text-white px-4 py-2 rounded-lg max-w-lg shadow-md">
                    <p className="font-semibold">You:</p>
                    <p>{msg.userInput}</p>
                  </div>
                </div>
              )}
              {msg.apiResponse && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 text-black px-4 py-2 rounded-lg max-w-lg shadow-md">
                    <p className="font-semibold">AI:</p>
                    <p>{msg.apiResponse}</p>
                    {msg.model && (
                      <p className="text-xs text-gray-500 mt-1">
                        Model: {msg.model}, Credits: {formatCredits(msg.creditsDeducted)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-black px-4 py-2 rounded-lg shadow-md animate-pulse">
                <p className="font-semibold">AI is thinking...</p>
              </div>
            </div>
          )}
        </div>
      )}
      <div ref={chatEndRef} />
    </div>
  );
};

export default ChatContainer;
