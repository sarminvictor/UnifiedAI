import React, { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";

interface ChatMessageProps {
  userInput: string;
  apiResponse: string;
  inputType: string;
  outputType: string;
  timestamp: string;
  contextId: string;
  model?: string;
  tokensUsed?: number;
  creditsDeducted?: number;
}

interface ChatContainerProps {
  chatMessages: ChatMessageProps[];
  isLoading?: boolean; // Add loading prop
}

const ChatContainer: React.FC<ChatContainerProps> = ({ chatMessages, isLoading }) => {
  console.log("🔹 Rendering ChatContainer:", chatMessages);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  return (
    <div className="flex-grow p-4 overflow-y-auto h-full bg-gray-100 rounded-lg shadow-inner">
      {!chatMessages?.length ? (
        <div className="text-center text-gray-500 mt-5">No messages yet.</div>
      ) : (
        <div className="flex flex-col space-y-4">
          {chatMessages.map((msg, index) => (
            <React.Fragment key={`${msg.timestamp}-${index}`}>
              {/* User Message */}
              {msg.userInput && (
                <div className="flex justify-end">
                  <div className="bg-blue-500 text-white px-4 py-2 rounded-lg max-w-lg shadow-md">
                    <p className="font-semibold">You:</p>
                    <p>{msg.userInput}</p>
                  </div>
                </div>
              )}

              {/* AI Response */}
              {msg.apiResponse && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 text-black px-4 py-2 rounded-lg max-w-lg shadow-md">
                    <p className="font-semibold">AI:</p>
                    <p>{msg.apiResponse}</p>
                    {msg.model && (
                      <p className="text-xs text-gray-500 mt-1">
                        Model: {msg.model}, Credits: {msg.creditsDeducted}
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
