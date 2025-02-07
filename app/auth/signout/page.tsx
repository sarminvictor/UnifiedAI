'use client';

import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    const signOutUser = async () => {
      await signOut();
      router.push('/auth/signin');
    };

    signOutUser();
  }, [router]);

  return (
    <div>
      <h1>Signing out...</h1>
    </div>
  );
}
