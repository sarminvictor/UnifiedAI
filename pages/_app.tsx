// pages/_app.tsx
import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import { ChatProvider } from '@/contexts/ChatContext';
import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <ChatProvider>
        <Component {...pageProps} />
      </ChatProvider>
    </SessionProvider>
  );
}

export default MyApp;
