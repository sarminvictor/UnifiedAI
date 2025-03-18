'use client';

import { SessionProvider } from "next-auth/react";
import { GeistProvider } from '@geist-ui/core';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GeistProvider>
        {children}
      </GeistProvider>
    </SessionProvider>
  );
}
