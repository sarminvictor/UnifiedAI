import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '../lib/providers';
import 'styles/globals.css';
import { Toaster } from 'sonner';
import { getSession } from 'next-auth/react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'UnifiedAI',
  description: 'AI Chat Application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = getSession();

  if (!session) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/signin';
    }
    return null;
  }

  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Toaster 
          position="top-right" 
          richColors 
          closeButton
          toastOptions={{
            style: { 
              background: 'white',
              border: '1px solid #e2e8f0'
            },
            classNames: {
              error: 'bg-red-500 text-white border-none',
            },
            duration: 8000
          }}
          theme="light"
          // Allow multiple toasts to be more visible
          expand={true}
          visibleToasts={3}
          gap={8}
        />
      </body>
    </html>
  );
}
