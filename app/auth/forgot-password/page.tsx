'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PanelLeft } from 'lucide-react';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Something went wrong. Please try again.');
            } else {
                setSuccess(true);
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            setError('Something went wrong. Please try again.');
        }
    };

    if (success) {
        return (
            <div className="bg-white flex h-screen overflow-hidden">
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="mt-4 text-2xl font-bold text-gray-900">Check your email</h2>
                        <p className="mt-2 text-gray-600">
                            We've sent you a password reset link to {email}
                        </p>
                        <div className="mt-6">
                            <Link
                                href="/auth/signin"
                                className="text-sm text-blue-600 hover:text-blue-500 transition-colors duration-200 cursor-pointer"
                            >
                                Back to Sign In
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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

                    {/* Forgot Password Form */}
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
                        {error && (
                            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                        >
                            Send Reset Link
                        </button>
                    </form>

                    {/* Links */}
                    <div className="mt-6 space-y-4 text-center">
                        <div>
                            <Link
                                href="/auth/signin"
                                className="text-sm text-blue-600 hover:text-blue-500 transition-colors duration-200 cursor-pointer"
                            >
                                Back to Sign In
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 