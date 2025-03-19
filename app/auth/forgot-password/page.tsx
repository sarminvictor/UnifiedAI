'use client';

import { useState } from 'react';
import { PanelLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send password reset email');
            }

            setSuccess(true);
        } catch (error: any) {
            console.error('Password reset error:', error);
            setError(error.message || 'Failed to send password reset email. Please try again.');
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Reset your password</h2>
                    <p className="text-gray-600">Enter your email address and we'll send you a link to reset your password.</p>
                </div>
            </div>

            {/* Right side - Forgot password form */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="sm:hidden flex items-center justify-center mb-8">
                        <PanelLeft className="w-8 h-8 text-gray-900" />
                        <h1 className="ml-2 text-2xl font-semibold text-gray-900">UnifiedAI</h1>
                    </div>

                    {success ? (
                        <div className="text-center">
                            <div className="bg-green-50 p-4 rounded-md mb-6">
                                <h3 className="text-lg font-medium text-green-800 mb-2">Check your email</h3>
                                <p className="text-green-700">
                                    We've sent a password reset link to <strong>{email}</strong>. Please check your inbox.
                                </p>
                            </div>
                            <Link
                                href="/auth/signin"
                                className="text-blue-600 hover:text-blue-500 transition-colors duration-200"
                            >
                                Return to sign in
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold mb-6 sm:hidden">Reset your password</h2>

                            {error && (
                                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md mb-4">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50"
                                >
                                    {isLoading ? 'Sending...' : 'Send Reset Link'}
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