'use client';

import { GeistProvider } from '@geist-ui/core';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <GeistProvider>
            {children}
            <Toaster />
        </GeistProvider>
    );
} 