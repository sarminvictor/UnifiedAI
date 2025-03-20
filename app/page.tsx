import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';

export default async function Home() {
  const session = await getServerSession(authOptions);

  // If user is not authenticated, redirect to sign in
  if (!session) {
    redirect('/auth/signin');
  }

  // If user is authenticated, redirect to dashboard
  redirect('/dashboard');
}
