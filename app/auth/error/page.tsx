'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PanelLeft } from 'lucide-react';

export default function AuthError() {
    const searchParams = useSearchParams();
    const [errorMessage, setErrorMessage] = useState('Authentication error');
    const [errorDescription, setErrorDescription] = useState('An error occurred during authentication.');

    useEffect(() => {
        // Get error information from URL
        const error = searchParams.get('error');

        if (error) {
            switch (error) {
                case 'Configuration':
                    setErrorMessage('Server Error');
                    setErrorDescription('There is a problem with the server configuration.');
                    break;
                case 'AccessDenied':
                    setErrorMessage('Access Denied');
                    setErrorDescription('You do not have permission to sign in.');
                    break;
                case 'Verification':
                    setErrorMessage('Verification Error');
                    setErrorDescription('The verification token has expired or has already been used.');
                    break;
                case 'OAuthSignin':
                    setErrorMessage('OAuth Error');
                    setErrorDescription('Error in the OAuth sign-in process.');
                    break;
                case 'OAuthCallback':
                    setErrorMessage('OAuth Callback Error');
                    setErrorDescription('Error in the OAuth callback process.');
                    break;
                case 'OAuthCreateAccount':
                    setErrorMessage('Account Creation Error');
                    setErrorDescription('Could not create OAuth provider account.');
                    break;
                case 'EmailCreateAccount':
                    setErrorMessage('Account Creation Error');
                    setErrorDescription('Could not create email provider account.');
                    break;
                case 'Callback':
                    setErrorMessage('Callback Error');
                    setErrorDescription('Error in the callback handler.');
                    break;
                case 'CredentialsSignin':
                    setErrorMessage('Invalid Credentials');
                    setErrorDescription('The email or password you entered is incorrect.');
                    break;
                default:
                    setErrorMessage('Authentication Error');
                    setErrorDescription('An error occurred during the authentication process.');
            }
        }
    }, [searchParams]);

    return (
        <div className="bg-white flex h-screen overflow-hidden">
            {/* Left side - Branding */}
            <div className="hidden sm:flex sm:w-1/2 lg:w-1/3 bg-gray-50 items-center justify-center p-8">
                <div className="max-w-md">
                    <div className="flex items-center mb-8">
                        <PanelLeft className="w-8 h-8 text-gray-900" />
                        <h1 className="ml-2 text-2xl font-semibold text-gray-900">UnifiedAI</h1>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Authentication Error</h2>
                    <p className="text-gray-600">We encountered a problem while trying to authenticate you.</p>
                </div>
            </div>

            {/* Right side - Error message */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="sm:hidden flex items-center justify-center mb-8">
                        <PanelLeft className="w-8 h-8 text-gray-900" />
                        <h1 className="ml-2 text-2xl font-semibold text-gray-900">UnifiedAI</h1>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                        <h2 className="text-xl font-semibold text-red-700 mb-2">{errorMessage}</h2>
                        <p className="text-red-600 mb-4">{errorDescription}</p>
                    </div>

                    <div className="space-y-4">
                        <Link href="/auth/signin">
                            <button className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                                Try Signing In Again
                            </button>
                        </Link>

                        <Link href="/">
                            <button className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                                Back to Home
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
} 