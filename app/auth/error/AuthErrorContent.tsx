'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    let errorMessage = 'An authentication error occurred';

    switch (error) {
        case 'Callback':
            errorMessage = 'There was an error with the authentication callback. Please try again.';
            break;
        case 'AccessDenied':
            errorMessage = 'Access denied. You do not have permission to access this resource.';
            break;
        case 'Verification':
            errorMessage = 'The verification link is invalid or has expired. Please request a new link.';
            break;
        case 'Configuration':
            errorMessage = 'There is a server configuration error. Please contact support.';
            break;
        default:
            if (error) {
                errorMessage = `Authentication error: ${error}`;
            }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
                <div className="mb-6 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                        <svg
                            className="h-8 w-8 text-red-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                </div>

                <h1 className="mb-4 text-center text-2xl font-bold text-gray-800">Authentication Error</h1>
                <p className="mb-6 text-center text-gray-600">{errorMessage}</p>

                <div className="flex flex-col space-y-4">
                    <Link
                        href="/auth/signin"
                        className="w-full rounded-md bg-blue-600 px-4 py-2 text-center text-white transition-colors hover:bg-blue-700"
                    >
                        Return to Sign In
                    </Link>
                    <Link
                        href="/"
                        className="w-full rounded-md bg-gray-200 px-4 py-2 text-center text-gray-800 transition-colors hover:bg-gray-300"
                    >
                        Go to Home Page
                    </Link>
                </div>
            </div>
        </div>
    );
} 