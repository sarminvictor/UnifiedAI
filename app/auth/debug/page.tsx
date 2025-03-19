'use client';

import { useState, useEffect } from 'react';
import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react';
import { getBaseUrl, getPossibleCallbackUrls } from "@/lib/runtime-config";

// Separate the content that uses useSession into its own component
function DebugContent({ session, status, domainInfo }: {
    session: any;
    status: string;
    domainInfo: {
        hostname: string;
        fullUrl: string;
        baseUrl: string;
        callbackUrls: string[];
    };
}) {
    const [envVars, setEnvVars] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const [authConfig, setAuthConfig] = useState<any>(null);
    const [loadingConfig, setLoadingConfig] = useState(false);

    useEffect(() => {
        // Check for error parameters in URL
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            const error = url.searchParams.get('error');
            if (error) {
                console.error('Auth error from URL:', error);
                setAuthError(error);
            }
        }
    }, []);

    useEffect(() => {
        async function checkEnv() {
            try {
                const res = await fetch('/api/debug/check-env');
                const data = await res.json();
                setEnvVars(data);
            } catch (error) {
                console.error('Error checking env:', error);
            } finally {
                setLoading(false);
            }
        }

        checkEnv();
    }, []);

    const checkAuthConfig = async () => {
        try {
            setLoadingConfig(true);
            const response = await fetch('/api/debug/auth-config');
            const data = await response.json();
            setAuthConfig(data);
        } catch (error) {
            console.error('Error fetching auth config:', error);
        } finally {
            setLoadingConfig(false);
        }
    };

    const handleSignIn = async () => {
        setLoadingConfig(true);
        try {
            await signIn('google', { callbackUrl: '/auth/debug' });
        } catch (error) {
            console.error('Sign in error:', error);
        } finally {
            setLoadingConfig(false);
        }
    };

    const handleDirectGoogleSignIn = async () => {
        setLoadingConfig(true);
        try {
            // Use our custom redirect endpoint
            window.location.href = `/api/auth/google-redirect?callbackUrl=${encodeURIComponent('/auth/debug')}`;
        } catch (error) {
            console.error('Direct sign in error:', error);
            setLoadingConfig(false);
        }
    };

    const handleSignOut = async () => {
        await signOut({ callbackUrl: '/auth/debug' });
    };

    const handleCheckAuth = async () => {
        try {
            const response = await fetch('/api/auth/check');
            const data = await response.json();
            console.log('Auth check response:', data);
            alert(JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Auth check error:', error);
            alert(`Error checking auth: ${error}`);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <h1 className="text-2xl font-bold mb-4">NextAuth.js Debug Page</h1>

            {authError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <p className="font-bold">Authentication Error</p>
                    <p>{authError}</p>
                </div>
            )}

            <section className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h2 className="text-xl font-semibold mb-2">Session Status: <span className="font-mono">{status}</span></h2>
                {session ? (
                    <div>
                        <p className="mb-2">User is authenticated!</p>
                        <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-60">
                            {JSON.stringify(session, null, 2)}
                        </pre>
                        <button
                            onClick={handleSignOut}
                            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p>User is not authenticated. Try signing in below.</p>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={handleSignIn}
                                disabled={loadingConfig}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                            >
                                {loadingConfig ? 'Loading...' : 'Google Sign-In (Standard)'}
                            </button>

                            <button
                                onClick={handleDirectGoogleSignIn}
                                disabled={loadingConfig}
                                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                            >
                                {loadingConfig ? 'Loading...' : 'Google Sign-In (Alternative Method)'}
                            </button>

                            <button
                                onClick={handleCheckAuth}
                                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                            >
                                Check Auth Configuration
                            </button>
                        </div>
                    </div>
                )}
            </section>

            <section className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h2 className="text-xl font-semibold mb-2">Domain Information</h2>
                <div className="space-y-2">
                    <p><strong>Current Hostname:</strong> <code className="bg-gray-100 px-1 py-0.5 rounded">{domainInfo.hostname}</code></p>
                    <p><strong>Base URL:</strong> <code className="bg-gray-100 px-1 py-0.5 rounded">{domainInfo.baseUrl}</code></p>

                    <div>
                        <p><strong>Possible Callback URLs:</strong></p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                            {domainInfo.callbackUrls.map((url, index) => (
                                <li key={index}>
                                    <code className="bg-gray-100 px-1 py-0.5 rounded">{url}</code>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="mt-4 p-3 bg-orange-100 rounded-lg">
                        <p className="text-sm">
                            <strong>Note:</strong> Make sure your Google OAuth configuration in Google Cloud Console includes
                            all these callback URLs as authorized redirect URIs. Domain mismatches are a common cause
                            of authentication failures in preview deployments.
                        </p>
                    </div>
                </div>
            </section>

            <section className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold mb-2">Environment Variables</h2>
                <div className="space-y-1">
                    <p>
                        <strong>NEXTAUTH_URL:</strong>{' '}
                        {process.env.NEXT_PUBLIC_AUTH_URL ? (
                            <span className="text-green-600">✓ Configured</span>
                        ) : (
                            <span className="text-red-600">✗ Not configured</span>
                        )}
                    </p>
                    <p>
                        <strong>NEXTAUTH_SECRET:</strong>{' '}
                        {process.env.NEXT_PUBLIC_AUTH_SECRET ? (
                            <span className="text-green-600">✓ Configured</span>
                        ) : (
                            <span className="text-red-600">✗ Not configured</span>
                        )}
                    </p>
                    <p>
                        <strong>GOOGLE_CLIENT_ID:</strong>{' '}
                        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
                            <span className="text-green-600">✓ Configured</span>
                        ) : (
                            <span className="text-red-600">✗ Not configured</span>
                        )}
                    </p>
                    <p>
                        <strong>GOOGLE_CLIENT_SECRET:</strong>{' '}
                        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET ? (
                            <span className="text-green-600">✓ Configured</span>
                        ) : (
                            <span className="text-red-600">✗ Not configured</span>
                        )}
                    </p>
                    <p>
                        <strong>DATABASE_URL:</strong>{' '}
                        {process.env.NEXT_PUBLIC_DATABASE_URL ? (
                            <span className="text-green-600">✓ Configured</span>
                        ) : (
                            <span className="text-red-600">✗ Not configured</span>
                        )}
                    </p>
                </div>
            </section>

            {authConfig && (
                <div className="mt-4 bg-gray-100 p-4 rounded">
                    <h2 className="text-xl font-semibold mb-2">Auth Configuration</h2>
                    <pre className="bg-gray-200 p-2 mt-2 rounded overflow-auto max-h-60 text-xs">
                        {JSON.stringify(authConfig, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

// Wrap the page with SessionProvider to prevent errors during static rendering
export default function AuthDebug() {
    const { data: session, status } = useSession();
    const [domainInfo, setDomainInfo] = useState<{
        hostname: string;
        fullUrl: string;
        baseUrl: string;
        callbackUrls: string[];
    }>({
        hostname: '',
        fullUrl: '',
        baseUrl: '',
        callbackUrls: [],
    });

    useEffect(() => {
        // Capture domain information
        setDomainInfo({
            hostname: window.location.hostname,
            fullUrl: window.location.href,
            baseUrl: getBaseUrl(),
            callbackUrls: getPossibleCallbackUrls(),
        });
    }, []);

    return (
        <SessionProvider>
            <DebugContent session={session} status={status} domainInfo={domainInfo} />
        </SessionProvider>
    );
} 