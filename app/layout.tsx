import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';
import { Toaster } from 'sonner';

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
            error: {
              style: {
                background: '#f44336',
                color: 'white',
                border: 'none'
              },
              duration: 8000, // Longer duration for errors
            }
          }}
          // Allow multiple toasts to be more visible
          expand={true}
          visibleToasts={3}
          gap={8}
        />
      </body>
    </html>
  );
}
