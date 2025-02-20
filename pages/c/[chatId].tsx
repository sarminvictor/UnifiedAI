import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Home from '../index';
import { useChatNavigation } from '@/hooks/chat/useChatNavigation';

export default function ChatPage() {
  const router = useRouter();
  useChatNavigation();
  
  return <Home />;
}

// Add getServerSideProps to ensure the page is always server-side rendered
export async function getServerSideProps() {
  return { props: {} };
}
