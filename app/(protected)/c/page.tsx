'use client';

import { MainContent } from '@/components/MainContent';

export default function DefaultChatPage() {
    // Use empty chatId - the MainContent component will handle the rest
    return <MainContent chatId="" />;
} 