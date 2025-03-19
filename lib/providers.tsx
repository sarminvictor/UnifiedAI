'use client';

import { SessionProvider } from "next-auth/react";
import { GeistProvider } from '@geist-ui/core';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GeistProvider>
        {children}
      </GeistProvider>
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
    </SessionProvider>
  );
}
