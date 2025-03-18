'use client';

import { useSession, signOut } from 'next-auth/react';

export default function UserDashboard() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <p className="text-center mt-6">Loading...</p>;
  }

  if (!session) {
    return <p className="text-center mt-6">You are not logged in.</p>;
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">User Dashboard</h2>
      <div className="border p-4 rounded-md shadow-md bg-white">
        <p>
          <strong>Name:</strong> {session.user?.name || 'Not set'}
        </p>
        <p>
          <strong>Email:</strong> {session.user?.email}
        </p>
        <p>
          <strong>Subscription:</strong> {session.user?.plan || 'Free'}
        </p>
      </div>

      {/* Logout Button */}
      <button
        onClick={() => signOut({ callbackUrl: '/auth/signin' })}
        className="mt-4 w-full bg-red-500 text-white p-2 rounded"
      >
        Logout
      </button>
    </div>
  );
}
