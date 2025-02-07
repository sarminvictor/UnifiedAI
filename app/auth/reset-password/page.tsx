'use client';

import { useState } from 'react';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('If this email exists, a reset link has been sent.');
      } else {
        setError(data.message || 'Something went wrong.');
      }
    } catch (error) {
      setError('Failed to send reset request.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-6 w-full max-w-md p-6">
        <h2 className="text-2xl font-bold text-center">Reset Password</h2>
        <form onSubmit={handleResetRequest} className="space-y-4">
          <div>
            <label htmlFor="email">Enter your email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full border p-2"
              required
            />
          </div>
          {message && <div className="text-green-500">{message}</div>}
          {error && <div className="text-red-500">{error}</div>}
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
            Send Reset Link
          </button>
        </form>
      </div>
    </div>
  );
}
