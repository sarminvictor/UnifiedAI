'use client';

import React from 'react';
import { SessionProvider } from "next-auth/react";
import { GeistProvider } from '@geist-ui/core';

export function Providers({
  children,
  session
}: {
  children: React.ReactNode;
  session: any;
}) {
  return (
    <SessionProvider session={session}>
      <GeistProvider>
        {children}
      </GeistProvider>
    </SessionProvider>
  );
}
