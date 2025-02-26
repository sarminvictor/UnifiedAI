// app/c/[chatId]/page.tsx
import { MainContent } from '@/components/MainContent';

interface ChatPageProps {
  params: {
    chatId: string;
  };
}

export default function ChatPage({ params }: ChatPageProps) {
  return <MainContent chatId={params.chatId} />;
}
