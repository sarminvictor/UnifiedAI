'use client';

import { useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PanelLeft } from 'lucide-react';

export default function SignOut() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    // If already signed out, redirect to sign in page
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    // If authenticated, sign out
    if (status === 'authenticated') {
      const performSignOut = async () => {
        await signOut({ redirect: false });
        // Redirect after sign out
        router.push('/auth/signin');
      };

      performSignOut();
    }
  }, [status, router]);

  return (
    <div className="bg-white flex h-screen overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="flex items-center mb-8">
          <PanelLeft className="w-8 h-8 text-gray-900" />
          <h1 className="ml-2 text-2xl font-semibold text-gray-900">UnifiedAI</h1>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Signing you out...</h2>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    </div>
  );
}
