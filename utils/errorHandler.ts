'use client';

import { SubscriptionErrorCode } from '@/services/subscriptions/types';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  INVALID_INPUT: 'INVALID_INPUT',
  CHAT_NOT_FOUND: 'CHAT_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  API_ERROR: 'API_ERROR',
  DELETED_CHAT: 'DELETED_CHAT'
} as const;

export class ErrorHandler {
  static handle(error: Error | AppError) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', {
        message: error.message,
        code: (error as AppError).code,
        stack: error.stack
      });
    }

    if (error instanceof AppError) {
      return {
        success: false,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode
      };
    }

    // Handle unknown errors
    return {
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      statusCode: 500
    };
  }

  static throwError(message: string, statusCode: number, code: string) {
    throw new AppError(message, statusCode, code);
  }
}

export function handleSubscriptionError(
  error: unknown,
  errorCode: SubscriptionErrorCode,
  context?: Record<string, any>
) {
  return handleError({
    error,
    errorCode,
    context,
    module: 'subscription'
  });
}
function handleError(arg0: { error: unknown; errorCode: SubscriptionErrorCode; context: Record<string, any> | undefined; module: string; }) {
  throw new Error('Function not implemented.');
}

