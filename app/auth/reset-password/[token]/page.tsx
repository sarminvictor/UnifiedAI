'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PanelLeft } from 'lucide-react';
import Link from 'next/link';

export default function ResetPassword({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { token } = params;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);

  // Validate token on page load
  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/reset-password/${token}`, {
          method: 'GET',
        });

        if (!response.ok) {
          setIsValidToken(false);
          setError('This password reset link is invalid or has expired.');
        }
      } catch (error) {
        console.error('Token validation error:', error);
        setIsValidToken(false);
        setError('Failed to validate password reset link.');
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);

      // Redirect to sign in page after 3 seconds
      setTimeout(() => {
        router.push('/auth/signin');
      }, 3000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white flex h-screen overflow-hidden">
      {/* Left side - Branding and welcome message */}
      <div className="hidden sm:flex sm:w-1/2 lg:w-1/3 bg-gray-50 items-center justify-center p-8">
        <div className="max-w-md">
          <div className="flex items-center mb-8">
            <PanelLeft className="w-8 h-8 text-gray-900" />
            <h1 className="ml-2 text-2xl font-semibold text-gray-900">UnifiedAI</h1>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Create new password</h2>
          <p className="text-gray-600">Your new password must be different from previously used passwords.</p>
        </div>
      </div>

      {/* Right side - Reset password form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="sm:hidden flex items-center justify-center mb-8">
            <PanelLeft className="w-8 h-8 text-gray-900" />
            <h1 className="ml-2 text-2xl font-semibold text-gray-900">UnifiedAI</h1>
          </div>

          {!isValidToken ? (
            <div className="text-center">
              <div className="bg-red-50 p-4 rounded-md mb-6">
                <h3 className="text-lg font-medium text-red-800 mb-2">Invalid or expired link</h3>
                <p className="text-red-700">
                  The password reset link is invalid or has expired. Please request a new password reset link.
                </p>
              </div>
              <Link
                href="/auth/forgot-password"
                className="text-blue-600 hover:text-blue-500 transition-colors duration-200"
              >
                Request a new reset link
              </Link>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="bg-green-50 p-4 rounded-md mb-6">
                <h3 className="text-lg font-medium text-green-800 mb-2">Password reset successful</h3>
                <p className="text-green-700">
                  Your password has been successfully reset. You'll be redirected to the sign in page shortly.
                </p>
              </div>
              <Link
                href="/auth/signin"
                className="text-blue-600 hover:text-blue-500 transition-colors duration-200"
              >
                Sign in now
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-6 sm:hidden">Create new password</h2>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50"
                >
                  {isLoading ? 'Resetting Password...' : 'Reset Password'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/auth/signin"
                  className="text-sm text-blue-600 hover:text-blue-500 transition-colors duration-200"
                >
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
