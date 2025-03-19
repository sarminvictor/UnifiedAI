'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function AuthDebugClient() {
    const { data: session, status } = useSession();
    const [apiData, setApiData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchAuthData() {
            try {
                setLoading(true);
                const response = await fetch('/api/debug/auth-test');
                if (!response.ok) {
                    throw new Error(`API responded with status ${response.status}`);
                }
                const result = await response.json();
                setApiData(result);
                setError(null);
            } catch (err: any) {
                console.error('Error fetching auth data:', err);
                setError(err.message || 'Unknown error occurred');
            } finally {
                setLoading(false);
            }
        }

        fetchAuthData();
    }, []);

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <div className="mb-4">
                <Link href="/debug" className="text-blue-500 hover:underline">
                    &larr; Back to Debug
                </Link>
            </div>

            <h1 className="text-2xl font-bold mb-6">NextAuth.js Diagnostics</h1>

            {/* Client-side session status */}
            <div className="mb-8 bg-white rounded-lg shadow p-6 border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Client-Side Session</h2>
                <div className="mb-2">
                    <span className="font-medium">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${status === 'authenticated' ? 'bg-green-100 text-green-800' :
                        status === 'loading' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                        {status}
                    </span>
                </div>

                {session ? (
                    <div className="mt-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="font-medium">User ID:</div>
                            <div>{session.user?.id || 'Not available'}</div>

                            <div className="font-medium">Email:</div>
                            <div>{session.user?.email || 'Not available'}</div>

                            <div className="font-medium">Name:</div>
                            <div>{session.user?.name || 'Not available'}</div>

                            <div className="font-medium">Expires:</div>
                            <div>{session.expires || 'Not available'}</div>
                        </div>

                        <div className="mt-4 flex space-x-4">
                            <Link href="/api/auth/signout">
                                <button className="bg-red-100 hover:bg-red-200 text-red-800 py-2 px-4 rounded text-sm">
                                    Sign Out
                                </button>
                            </Link>
                        </div>
                    </div>
                ) : status === 'unauthenticated' ? (
                    <div className="mt-4">
                        <p className="text-gray-600 mb-4">
                            You are not currently signed in. Sign in to test authentication.
                        </p>
                        <Link href="/api/auth/signin">
                            <button className="bg-blue-100 hover:bg-blue-200 text-blue-800 py-2 px-4 rounded text-sm">
                                Sign In
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div className="animate-pulse mt-4 h-20 bg-gray-100 rounded"></div>
                )}
            </div>

            {/* Server-side session data */}
            {loading ? (
                <div className="flex justify-center my-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : error ? (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <p className="font-bold">Error!</p>
                    <p>{error}</p>
                </div>
            ) : apiData ? (
                <div className="space-y-6">
                    {/* Server Session */}
                    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                        <h2 className="text-xl font-semibold mb-4">Server-Side Session</h2>
                        {apiData.session ? (
                            <div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="font-medium">Status:</div>
                                    <div>
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Authenticated
                                        </span>
                                    </div>

                                    <div className="font-medium">User ID:</div>
                                    <div>{apiData.session.user?.id || 'Not available'}</div>

                                    <div className="font-medium">Email:</div>
                                    <div>{apiData.session.user?.email || 'Not available'}</div>

                                    <div className="font-medium">Name:</div>
                                    <div>{apiData.session.user?.name || 'Not available'}</div>

                                    <div className="font-medium">Expires:</div>
                                    <div>{apiData.session.expires || 'Not available'}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-yellow-700 bg-yellow-50 p-4 rounded">
                                No active session detected on the server.
                            </div>
                        )}
                    </div>

                    {/* JWT Token Info */}
                    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                        <h2 className="text-xl font-semibold mb-4">JWT Token Information</h2>
                        {apiData.token ? (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="font-medium">Subject (User ID):</div>
                                <div>{apiData.token.sub || 'Not available'}</div>

                                <div className="font-medium">Issued At:</div>
                                <div>{apiData.token.iat ? new Date(apiData.token.iat * 1000).toLocaleString() : 'Not available'}</div>

                                <div className="font-medium">Expires:</div>
                                <div>{apiData.token.exp ? new Date(apiData.token.exp * 1000).toLocaleString() : 'Not available'}</div>

                                <div className="font-medium">JWT ID:</div>
                                <div>{apiData.token.jti || 'Not available'}</div>
                            </div>
                        ) : (
                            <div className="text-yellow-700 bg-yellow-50 p-4 rounded">
                                No JWT token detected.
                            </div>
                        )}
                    </div>

                    {/* NextAuth Adapter */}
                    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                        <h2 className="text-xl font-semibold mb-4">NextAuth Adapter</h2>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="font-medium">Adapter Available:</div>
                            <div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${apiData.adapter.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {apiData.adapter.available ? 'Yes' : 'No'}
                                </span>
                            </div>

                            <div className="font-medium">User Count:</div>
                            <div>{apiData.adapterTests.getUserCount}</div>
                        </div>

                        <div className="mt-4">
                            <h3 className="font-medium mb-2">Available Adapter Methods:</h3>
                            <div className="flex flex-wrap gap-2">
                                {apiData.adapter.methods.map((method: string) => (
                                    <span key={method} className="bg-gray-100 px-2 py-1 rounded text-xs">
                                        {method}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Environment Variables */}
                    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                        <h2 className="text-xl font-semibold mb-4">Environment Configuration</h2>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(apiData.environmentVars).map(([key, value]) => (
                                <Fragment key={key}>
                                    <div className="font-medium">{key}:</div>
                                    <div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${Boolean(value) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {Boolean(value) ? 'Present' : 'Missing'}
                                        </span>
                                    </div>
                                </Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Request Info */}
                    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                        <h2 className="text-xl font-semibold mb-4">Request Information</h2>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="font-medium">URL:</div>
                            <div className="break-all">{apiData.request.url}</div>

                            <div className="font-medium">Cookie Header:</div>
                            <div>{apiData.request.headers.cookie}</div>

                            <div className="font-medium">Authorization Header:</div>
                            <div>{apiData.request.headers.authorization}</div>
                        </div>
                    </div>

                    {/* Raw Data */}
                    <div className="mt-6">
                        <h3 className="font-semibold mb-2">Raw Response Data:</h3>
                        <pre className="bg-gray-800 text-green-400 p-4 rounded overflow-x-auto text-xs">
                            {JSON.stringify(apiData, null, 2)}
                        </pre>
                    </div>
                </div>
            ) : null}
        </div>
    );
} 