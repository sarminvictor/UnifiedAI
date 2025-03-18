'use client';

import { useSearchParams } from 'next/navigation';

export default function AuthError() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-lg">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-900">Authentication Error</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {error === 'AccessDenied'
                            ? 'You do not have permission to sign in.'
                            : 'An error occurred during authentication.'}
                    </p>
                </div>
                <div className="mt-6 text-center">
                    <a
                        href="/api/auth/signin"
                        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                        Try Again
                    </a>
                </div>
            </div>
        </div>
    );
} 