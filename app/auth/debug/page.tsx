'use client';

import { useState, useEffect } from 'react';
import { SessionProvider, useSession, signIn } from 'next-auth/react';

// Separate the content that uses useSession into its own component
function DebugContent() {
    const { data: session, status } = useSession();
    const [envVars, setEnvVars] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const [authConfig, setAuthConfig] = useState<any>(null);
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [domainInfo, setDomainInfo] = useState({
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
        fullUrl: typeof window !== 'undefined' ? window.location.href : 'unknown'
    });

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

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">NextAuth Debug</h1>

            {authError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <p className="font-bold">Authentication Error</p>
                    <p>{authError}</p>
                </div>
            )}

            <div className="bg-gray-100 p-4 rounded mb-4">
                <h2 className="text-xl font-semibold mb-2">Session Status</h2>
                <p><strong>Status:</strong> {status}</p>
                {session ? (
                    <div className="mt-2">
                        <p><strong>User:</strong> {session.user?.name || session.user?.email || 'No user info'}</p>
                        <p><strong>Email:</strong> {session.user?.email || 'No email'}</p>
                        <pre className="bg-gray-200 p-2 mt-2 rounded overflow-auto max-h-60">
                            {JSON.stringify(session, null, 2)}
                        </pre>
                    </div>
                ) : (
                    <p className="mt-2">No session data</p>
                )}
            </div>

            <div className="bg-gray-100 p-4 rounded mb-4">
                <h2 className="text-xl font-semibold mb-2">Environment Variables</h2>
                {loading ? (
                    <p>Loading environment data...</p>
                ) : envVars ? (
                    <>
                        <p><strong>Base URL:</strong> {envVars.baseUrl}</p>
                        <h3 className="font-medium mt-2">Environment Variables</h3>
                        <ul className="list-disc pl-5 mt-1">
                            {Object.entries(envVars.variables).map(([key, value]) => (
                                <li key={key} className={value ? "text-green-600" : "text-red-600"}>
                                    {key}: {value ? "✓" : "✗"}
                                </li>
                            ))}
                        </ul>
                    </>
                ) : (
                    <p>Failed to load environment data</p>
                )}
            </div>

            <div className="mt-4 space-y-2">
                <button
                    onClick={() => signIn('google', { callbackUrl: '/' })}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Sign in with Google (Standard Method)
                </button>

                <button
                    onClick={() => window.location.href = '/api/auth/google-redirect?callbackUrl=/'}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                    Sign in with Google (Special Redirect)
                </button>

                <button
                    onClick={checkAuthConfig}
                    className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                    Check Auth Configuration
                </button>
            </div>

            {authConfig && (
                <div className="mt-4 bg-gray-100 p-4 rounded">
                    <h2 className="text-xl font-semibold mb-2">Auth Configuration</h2>
                    <pre className="bg-gray-200 p-2 mt-2 rounded overflow-auto max-h-60 text-xs">
                        {JSON.stringify(authConfig, null, 2)}
                    </pre>
                </div>
            )}

            <div className="mt-4 bg-yellow-50 p-4 rounded border border-yellow-300">
                <h2 className="text-xl font-semibold mb-2">Domain Information</h2>
                <p><strong>Current Hostname:</strong> {domainInfo.hostname}</p>
                <p><strong>Full URL:</strong> {domainInfo.fullUrl}</p>
                <p className="mt-2 text-sm text-yellow-800">
                    Note: If this hostname doesn't match your configured callback URLs in Google Cloud Console,
                    authentication will fail.
                </p>
            </div>
        </div>
    );
}

// Wrap the page with SessionProvider to prevent errors during static rendering
export default function AuthDebug() {
    return (
        <SessionProvider>
            <DebugContent />
        </SessionProvider>
    );
} 