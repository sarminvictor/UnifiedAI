import useSWR from 'swr';
import { useChatStore } from '@/store/chat/chatStore';

const fetcher = async (url: string) => {
  const res = await fetch(url, { 
    headers: { 'Cache-Control': 'no-cache' }
  });
  if (!res.ok) throw new Error('Failed to fetch chats');
  return res.json();
};

export const useChats = () => {
  const { dispatch } = useChatStore();

  const { data, error, mutate } = useSWR('/api/getChats', fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    errorRetryCount: 3,
    dedupingInterval: 5000,
    onSuccess: (data) => {
      if (data.success) {
        dispatch({ type: 'SET_CHATS', payload: data.data.activeChats });
      }
    }
  });

  return {
    isLoading: !error && !data,
    error,
    mutate
  };
};
