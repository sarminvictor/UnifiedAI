export class ServerError extends Error {
  code: string;
  details?: string;

  constructor(code: string, message: string, details?: string) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'ServerError';
  }
}

export const ServerErrorCodes = {
  AI_PROCESSING_ERROR: 'AI_PROCESSING_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND'
} as const;

export const handleServerError = (error: unknown) => {
  if (error instanceof ServerError) {
    return {
      success: false,
      code: error.code,
      message: error.message,
      details: error.details
    };
  }
  return {
    success: false,
    message: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? 
      error instanceof Error ? error.message : 'Unknown error' 
      : undefined
  };
};
