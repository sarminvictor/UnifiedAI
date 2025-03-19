'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';

export default function AuthDebug() {
    const { data: session, status } = useSession();
    const [envVars, setEnvVars] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">NextAuth Debug</h1>

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

            <div className="mt-4">
                <button
                    onClick={() => signIn('google')}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Sign in with Google (Test)
                </button>
            </div>
        </div>
    );
} 