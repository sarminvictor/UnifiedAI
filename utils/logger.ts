const isProd = process.env.NODE_ENV === 'production';
const DEBUG = process.env.DEBUG === 'true';

export const logger = {
  error: (message: string, error: any) => {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${new Date().toISOString()}] ${message}`, error);
    }
  },
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] ${message}`, data || '');
    }
  }
};
