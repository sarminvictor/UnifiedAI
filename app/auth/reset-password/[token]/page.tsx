'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch('/api/auth/reset-password/' + params.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      setMessage('Password reset successfully! Redirecting...');
      setTimeout(() => router.push('/auth/signin'), 3000);
    } else {
      setError('Failed to reset password.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-6">
        <h2 className="text-2xl font-bold text-center">Enter New Password</h2>
        <form onSubmit={handleReset}>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full p-2 border" required />
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded mt-4">Reset Password</button>
        </form>
        {message && <p className="text-green-500">{message}</p>}
        {error && <p className="text-red-500">{error}</p>}
      </div>
    </div>
  );
}
