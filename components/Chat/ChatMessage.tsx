'use client';

import React, { useEffect, useRef } from 'react';
import { logger } from '@/utils/logger';

interface Message {
  id: string;
  userInput: string;
  apiResponse: string;
  model?: string;
  creditsDeducted?: number | { toString: () => string } | string;
  timestamp: string;
  inputType?: string;
  outputType?: string;
  brainstormMessages?: string[];
}

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  // Log only important messages like user messages in brainstorm mode
  useEffect(() => {
    // Only log first user messages in brainstorm mode
    if (message.userInput && !message.apiResponse && message.inputType === 'text' && message.outputType === 'brainstorm') {
      logger.debug('Found user message in brainstorm chat in ChatMessage component:', {
        userInput: message.userInput?.substring(0, 30) + (message.userInput?.length > 30 ? '...' : ''),
        id: message.id
      });
    }
  }, [message]);

  // Check if this is a combined message (has both user input and API response)
  const isCombinedMessage = !!message.userInput && !!message.apiResponse;

  // If it's a combined message, split it into two separate messages
  if (isCombinedMessage) {
    // Skip splitting if this is a brainstorm message
    if (message.inputType === 'brainstorm' || message.outputType === 'brainstorm') {
      // For brainstorm messages, we only want to show the API response
      return (
        <ChatMessage
          message={{
            ...message,
            userInput: '',
            inputType: message.inputType || 'text',
            outputType: message.outputType || 'text'
          }}
        />
      );
    }

    return (
      <>
        {/* Render user message */}
        <ChatMessage
          message={{
            ...message,
            apiResponse: '',
            inputType: 'text',
            outputType: 'text'
          }}
        />

        {/* Render AI response */}
        <ChatMessage
          message={{
            ...message,
            userInput: '',
            inputType: message.inputType || 'text',
            outputType: message.outputType || 'text'
          }}
        />
      </>
    );
  }

  const isUserMessage = !!message.userInput;
  const isBrainstorm = message.inputType === 'brainstorm' || message.outputType === 'brainstorm';
  const isSummary = message.outputType === 'summary';

  // Special case for user messages in brainstorm mode
  // These are user messages with inputType='text' and outputType='brainstorm'
  const isUserMessageInBrainstorm = isUserMessage &&
    message.inputType === 'text' &&
    message.outputType === 'brainstorm';

  // Skip user input messages with both inputType='brainstorm' and outputType='brainstorm'
  // But keep user messages with inputType='text' and outputType='brainstorm'
  if (isUserMessage && message.inputType === 'brainstorm' && message.outputType === 'brainstorm') {
    return null;
  }

  // Special case: Always render user messages in brainstorm mode
  if (isUserMessageInBrainstorm) {
    return (
      <div className="mb-4 flex justify-end">
        <div className="p-3 rounded-lg max-w-md bg-gray-300 text-black">
          <p>{message.userInput}</p>
        </div>
      </div>
    );
  }

  // Handle creditsDeducted which might be a Decimal from Prisma
  const formatCredits = (credits: number | { toString: () => string } | string | undefined) => {
    if (!credits) return "0.00";

    let creditValue: number;
    if (typeof credits === 'number') {
      creditValue = credits;
    } else if (typeof credits === 'string') {
      creditValue = parseFloat(credits);
    } else {
      creditValue = parseFloat(credits.toString());
    }

    return (Math.ceil(creditValue * 100) / 100).toFixed(2);
  };

  // Render a regular message
  if (isUserMessageInBrainstorm || (!isBrainstorm && !isSummary)) {
    return (
      <div
        className={`mb-4 flex ${isUserMessage ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`p-3 rounded-lg max-w-md ${isUserMessage ? "bg-gray-300 text-black" : "bg-transparent text-gray-800"
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
  }

  // Render a brainstorm message (like a group chat)
  if (isBrainstorm && !isSummary && !isUserMessageInBrainstorm) {
    return (
      <div className="mb-4 flex justify-start">
        <div className="p-3 rounded-lg max-w-md bg-transparent text-gray-800">
          {message.apiResponse && <p>{message.apiResponse}</p>}
          {message.model && message.creditsDeducted !== undefined && (
            <p className="text-xs text-gray-500 mt-1 text-right">
              Model: {message.model} | Credits: {formatCredits(message.creditsDeducted)}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Render a summary message
  if (isSummary) {
    return (
      <div className="my-6 border-t border-b border-gray-200 py-4">
        <div className="flex items-start">
          <div className="flex flex-col w-full">
            <div className="bg-transparent p-3 rounded-lg">
              <p className="font-medium text-purple-800 mb-2">Brainstorming Summary</p>
              <p>{message.apiResponse}</p>
            </div>
            {message.model && message.creditsDeducted !== undefined && (
              <p className="text-xs text-gray-500 mt-1 text-right">
                Model: {message.model} | Credits: {formatCredits(message.creditsDeducted)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
};

export default ChatMessage;
