'use client';

const isProd = process.env.NODE_ENV === 'production';
const DEBUG = process.env.DEBUG === 'true';

const logger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${new Date().toISOString()}] ${message}`, data || '');
    }
  },
  error: (message: string, data?: any) => {
    console.error(`[${new Date().toISOString()}] ${message}`, data || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[${new Date().toISOString()}] ${message}`, data || '');
  },
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${new Date().toISOString()}] ${message}`, data || '');
    }
  }
};

export { logger };
