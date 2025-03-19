'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthError() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    // Define friendly error messages for common NextAuth errors
    const getErrorMessage = (errorCode: string | null) => {
        switch (errorCode) {
            case 'Configuration':
                return 'There is a problem with the server configuration. Please contact support.';
            case 'AccessDenied':
                return 'You do not have permission to sign in.';
            case 'Verification':
                return 'The verification link is no longer valid. It may have expired or been used already.';
            case 'OAuthSignin':
            case 'OAuthCallback':
            case 'OAuthCreateAccount':
            case 'EmailCreateAccount':
            case 'Callback':
                return 'There was a problem with the authentication service. Please try again.';
            case 'OAuthAccountNotLinked':
                return 'To confirm your identity, sign in with the same account you used originally.';
            case 'EmailSignin':
                return 'The email could not be sent. Please try again later.';
            case 'CredentialsSignin':
                return 'The email or password you entered is incorrect. Please try again.';
            case 'SessionRequired':
                return 'Please sign in to access this page.';
            default:
                return 'An unexpected error occurred. Please try again.';
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-red-600">Authentication Error</h1>
                    <div className="mt-4 rounded-md bg-red-50 p-4">
                        <p className="text-sm text-red-700">{getErrorMessage(error)}</p>
                    </div>
                    <p className="mt-6 text-gray-600">
                        Error code: <code className="rounded bg-gray-100 px-2 py-1 font-mono text-sm">{error || 'unknown'}</code>
                    </p>
                    <div className="mt-8 space-y-4">
                        <Link
                            href="/auth/signin"
                            className="block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Try signing in again
                        </Link>
                        <Link
                            href="/"
                            className="block w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Return to home page
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
} 