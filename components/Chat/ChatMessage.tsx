'use client';

import React, { useEffect, useRef } from 'react';
import { logger } from '@/utils/logger';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/github.css'; // Import a highlight.js style

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

  // Custom components for ReactMarkdown
  const MarkdownComponents = {
    // Style code blocks with proper syntax highlighting
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <div className="rounded-md overflow-hidden my-2">
          <pre className={`${className} p-4 bg-gray-800 text-white overflow-auto`} {...props}>
            <code className={`language-${match[1]}`}>{children}</code>
          </pre>
        </div>
      ) : (
        <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      );
    },
    // Style blockquotes
    blockquote({ children }: any) {
      return (
        <blockquote className="border-l-4 border-gray-300 pl-4 py-1 my-2 italic text-gray-700">
          {children}
        </blockquote>
      );
    },
    // Style links
    a({ href, children }: any) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {children}
        </a>
      );
    },
    // Style headings
    h1: ({ children }: any) => <h1 className="text-xl font-bold my-3">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-xl font-bold my-3">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-lg font-bold my-2">{children}</h3>,
    h4: ({ children }: any) => <h4 className="text-base font-bold my-2">{children}</h4>,
    // Style lists
    ul: ({ children }: any) => <ul className="list-disc pl-6 my-2">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-6 my-2">{children}</ol>,
    // Style tables
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border border-gray-300">{children}</table>
      </div>
    ),
    thead: ({ children }: any) => <thead className="bg-gray-100">{children}</thead>,
    th: ({ children }: any) => <th className="border border-gray-300 px-4 py-2 text-left">{children}</th>,
    td: ({ children }: any) => <td className="border border-gray-300 px-4 py-2">{children}</td>,
  };

  // Special case: Always render user messages in brainstorm mode
  if (isUserMessageInBrainstorm) {
    return (
      <div className="mb-8 flex justify-end">
        <div className="p-3 rounded-lg max-w-md bg-[#F3F4F6] user-message-bg text-black">
          <ReactMarkdown
            rehypePlugins={[rehypeSanitize, rehypeHighlight]}
            remarkPlugins={[remarkGfm]}
            components={MarkdownComponents}
          >
            {message.userInput}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  // Render a regular message
  if (!isBrainstorm && !isSummary) {
    return (
      <div
        className={`${isUserMessage ? "mb-8 flex justify-end" : "mb-12 flex justify-start"}`}
      >
        <div
          className={`p-3 rounded-lg ${isUserMessage
            ? "max-w-md bg-[#F3F4F6] user-message-bg text-black"
            : "max-w-4xl bg-transparent text-gray-800 prose prose-sm"}`}
        >
          {message.userInput && (
            <ReactMarkdown
              rehypePlugins={[rehypeSanitize, rehypeHighlight]}
              remarkPlugins={[remarkGfm]}
              components={MarkdownComponents}
            >
              {message.userInput}
            </ReactMarkdown>
          )}

          {message.apiResponse && (
            <ReactMarkdown
              rehypePlugins={[rehypeSanitize, rehypeHighlight]}
              remarkPlugins={[remarkGfm]}
              components={MarkdownComponents}
            >
              {message.apiResponse}
            </ReactMarkdown>
          )}

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
      <div className="mb-12 flex justify-start">
        <div className="p-3 rounded-lg max-w-4xl bg-transparent text-gray-800 prose prose-sm">
          {message.apiResponse && (
            <ReactMarkdown
              rehypePlugins={[rehypeSanitize, rehypeHighlight]}
              remarkPlugins={[remarkGfm]}
              components={MarkdownComponents}
            >
              {message.apiResponse}
            </ReactMarkdown>
          )}
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
      <div className="my-6 mb-12 border-t border-b border-gray-200 py-4">
        <div className="flex items-start">
          <div className="flex flex-col w-full">
            <div className="bg-transparent p-3 rounded-lg prose prose-sm max-w-4xl">
              <p className="font-medium text-[#171717] mb-2">Brainstorming Summary</p>
              <ReactMarkdown
                rehypePlugins={[rehypeSanitize, rehypeHighlight]}
                remarkPlugins={[remarkGfm]}
                components={MarkdownComponents}
              >
                {message.apiResponse}
              </ReactMarkdown>
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
