'use client';

import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chat/chatStore';

export const useChatNavigation = () => {
  const { dispatch, chats } = useChatStore();
  const router = useRouter();
  const initialLoadDone = useRef(false);

  // Single effect to handle both initial load and navigation
  useEffect(() => {
    if (chats.length === 0) return;

    // Get chat ID from URL path
    const urlChatId = router.asPath.split('/c/')?.[1];
    if (!urlChatId) return;

    // Find chat and select it
    const chat = chats.find(c => c.chat_id === urlChatId);
    if (chat && !initialLoadDone.current) {
      initialLoadDone.current = true;
      dispatch({ type: 'SET_CURRENT_CHAT', payload: urlChatId });
    } else if (!chat) {
      router.replace('/', undefined, { shallow: true });
    }
  }, [chats, router.asPath, dispatch]);

  return null;
};
