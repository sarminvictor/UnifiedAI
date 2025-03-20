import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { MainContent } from '@/components/MainContent';

export default async function Home() {
  const session = await getServerSession(authOptions);

  // If user is not authenticated, redirect to sign in
  if (!session) {
    redirect('/auth/signin');
  }

  // For authenticated users, show the main chat interface
  // Generate a temporary chat ID for the main page
  const tempChatId = `temp_${Date.now()}`;
  return <MainContent chatId={tempChatId} />;
}
