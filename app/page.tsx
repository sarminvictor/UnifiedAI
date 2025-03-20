import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';

export default async function Home() {
  const session = await getServerSession(authOptions);

  // If user is authenticated, redirect to the protected chat interface
  if (session) {
    redirect('/c');
  }

  // Otherwise show landing page for non-authenticated users
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to UnifiedAI</h1>
      <p className="mb-8 text-xl">Your AI Assistant for all tasks</p>
      <div className="flex space-x-4">
        <a
          href="/auth/signin"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Sign In
        </a>
        <a
          href="/debug"
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          System Diagnostics
        </a>
      </div>
    </div>
  );
}
