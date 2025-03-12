'use client';

const isProd = process.env.NODE_ENV === 'production';
const DEBUG = process.env.DEBUG === 'true';

// Add log level configuration
type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';
const LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || (isProd ? 'info' : 'debug');

// Define log level priorities
const LOG_LEVEL_PRIORITY = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4
};

// Filter categories that generate too much noise
const NOISY_CATEGORIES = [
  'token',
  'Skipping duplicate event dispatch: token'
];

// Global throttling configuration
interface ThrottleConfig {
  // Default throttle time in milliseconds (5 seconds)
  defaultInterval: number;
  // Specific throttle times for certain message patterns (in milliseconds)
  messagePatterns: Record<string, number>;
}

const THROTTLE_CONFIG: ThrottleConfig = {
  defaultInterval: 5000, // 5 seconds default throttle
  messagePatterns: {
    // High frequency events - longer throttle
    'Token for unknown message': 30000,
    'Updating streaming message': 10000,
    'Token event': 60000,
    'Current streaming messages count': 10000,
    'Tab became visible': 15000,

    // Medium frequency events
    'Processing messages from server': 5000,
    'Rendering streaming messages': 5000,
    'Stream connection': 5000,
    'Received stream chunk': 10000,

    // Low frequency but less critical events
    'Adding message to chat': 3000,
    'Streaming event listeners': 10000,
    'Message start event received': 3000,
    'Message complete event received': 3000,
    'Summary': 3000,
    'Brainstorm': 3000
  }
};

// Store last log times
const lastLogTimes: Record<string, number> = {};

// Generate a key for throttling based on message and data
const getThrottleKey = (level: LogLevel, message: string, data?: any): string => {
  // For simple throttling, just use the message
  // For more complex throttling, could include parts of the data
  let key = `${level}:${message}`;

  // If data contains an id, chatId, or messageId, include it in the key
  // This allows throttling per-entity rather than globally for that message type
  if (data) {
    if (typeof data === 'object') {
      const idFields = ['id', 'chatId', 'messageId', 'streamId'];
      for (const field of idFields) {
        if (data[field] !== undefined) {
          key += `:${field}=${data[field]}`;
          break; // Only use the first id field found
        }
      }
    }
  }

  return key;
};

// Check if a log should be throttled
const isThrottled = (level: LogLevel, message: string, data?: any): boolean => {
  // Never throttle errors
  if (level === 'error') return false;

  const now = Date.now();
  const key = getThrottleKey(level, message, data);
  const lastTime = lastLogTimes[key] || 0;

  // Determine throttle interval based on message content
  let throttleInterval = THROTTLE_CONFIG.defaultInterval;

  // Check if message matches any patterns for custom throttling
  for (const pattern in THROTTLE_CONFIG.messagePatterns) {
    if (message.includes(pattern)) {
      throttleInterval = THROTTLE_CONFIG.messagePatterns[pattern];
      break;
    }
  }

  // Check if enough time has passed since the last log
  if (now - lastTime < throttleInterval) {
    return true; // Throttled
  }

  // Update last log time
  lastLogTimes[key] = now;
  return false; // Not throttled
};

// Check if we should log based on level and category
const shouldLog = (level: LogLevel, message: string, data?: any): boolean => {
  // Always log errors
  if (level === 'error') return true;

  // Check if message contains any noisy category
  if (level === 'debug' && NOISY_CATEGORIES.some(category => message.includes(category))) {
    return false;
  }

  // Check log level priority
  if (LOG_LEVEL_PRIORITY[level] > LOG_LEVEL_PRIORITY[LOG_LEVEL]) {
    return false;
  }

  // Check throttling
  if (isThrottled(level, message, data)) {
    return false;
  }

  return true;
};

const logger = {
  info: (message: string, data?: any) => {
    if (shouldLog('info', message, data)) {
      console.log(`[${new Date().toISOString()}] ${message}`, data || '');
    }
  },
  error: (message: string, data?: any) => {
    console.error(`[${new Date().toISOString()}] ${message}`, data || '');
  },
  warn: (message: string, data?: any) => {
    if (shouldLog('warn', message, data)) {
      console.warn(`[${new Date().toISOString()}] ${message}`, data || '');
    }
  },
  debug: (message: string, data?: any) => {
    if (shouldLog('debug', message, data)) {
      console.debug(`[${new Date().toISOString()}] ${message}`, data || '');
    }
  },
  trace: (message: string, data?: any) => {
    if (shouldLog('trace', message, data)) {
      console.debug(`[${new Date().toISOString()}] TRACE: ${message}`, data || '');
    }
  },
  // Helper method to check if debug is enabled
  isDebugEnabled: () => {
    return LOG_LEVEL_PRIORITY[LOG_LEVEL] >= LOG_LEVEL_PRIORITY['debug'];
  }
};

export { logger };
