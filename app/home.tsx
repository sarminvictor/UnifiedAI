'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/user'); // ✅ Redirect logged-in users to /user
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return <p>Loading...</p>; // ✅ Show loading indicator while checking session
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold">Welcome to My App</h1>
      <p className="text-gray-600">Please log in to continue.</p>

      {/* Sign In Button (Visible Only for Guests) */}
      {!session && (
        <button
          onClick={() => signIn()} // ✅ Opens NextAuth Sign-In Page
          className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Sign In
        </button>
      )}
    </div>
  );
}
