import { MainContent } from '@/components/MainContent';

export default function Home() {
  // Generate a temporary chat ID for the main page
  const tempChatId = `temp_${Date.now()}`;
  return <MainContent chatId={tempChatId} />;
}
