'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DebugPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const fetchDebugInfo = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/debug');
                if (!response.ok) {
                    throw new Error(`API responded with status: ${response.status}`);
                }
                const result = await response.json();
                setData(result);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch diagnostic data');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchDebugInfo();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-3xl">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Diagnostic Information</h1>
                    <Link href="/" className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
                        Back to Home
                    </Link>
                </div>

                {loading && (
                    <div className="rounded-lg bg-white p-8 shadow-md">
                        <p className="text-center text-gray-700">Loading diagnostic data...</p>
                    </div>
                )}

                {error && (
                    <div className="rounded-lg bg-red-50 p-8 shadow-md">
                        <h2 className="mb-4 text-xl font-semibold text-red-700">Error</h2>
                        <p className="text-red-600">{error}</p>
                    </div>
                )}

                {data && (
                    <div className="space-y-6">
                        {/* General Info */}
                        <div className="rounded-lg bg-white p-6 shadow-md">
                            <h2 className="mb-4 text-xl font-semibold">General Info</h2>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="font-medium">Timestamp:</div>
                                <div>{data.timestamp}</div>
                                <div className="font-medium">Environment:</div>
                                <div>{data.environment}</div>
                            </div>
                        </div>

                        {/* Environment Variables */}
                        <div className="rounded-lg bg-white p-6 shadow-md">
                            <h2 className="mb-4 text-xl font-semibold">Environment Variables</h2>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(data.envVars).map(([key, value]: [string, any]) => (
                                    <React.Fragment key={key}>
                                        <div className="font-medium">{key}:</div>
                                        <div className={value === '✗ Missing' ? 'text-red-600' : ''}>
                                            {value || 'Not set'}
                                        </div>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        {/* Database */}
                        <div className="rounded-lg bg-white p-6 shadow-md">
                            <h2 className="mb-4 text-xl font-semibold">Database</h2>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="font-medium">Status:</div>
                                <div className={data.database.status.includes('Error') ? 'text-red-600' : 'text-green-600'}>
                                    {data.database.status}
                                </div>
                                <div className="font-medium">Prisma Client:</div>
                                <div>{data.database.prismaClient}</div>
                                <div className="font-medium">User Count:</div>
                                <div>{data.database.userCount}</div>
                                <div className="font-medium">Available Models:</div>
                                <div>{data.database.availableModels?.join(', ') || 'None'}</div>
                            </div>
                        </div>

                        {/* Next Steps */}
                        <div className="rounded-lg bg-blue-50 p-6 shadow-md">
                            <h2 className="mb-4 text-xl font-semibold text-blue-700">Recommendations</h2>
                            <ul className="list-inside list-disc space-y-2 text-blue-900">
                                {data.envVars.DATABASE_URL === '✗ Missing' && (
                                    <li>Set the DATABASE_URL environment variable in Vercel</li>
                                )}
                                {data.envVars.NEXTAUTH_SECRET === '✗ Missing' && (
                                    <li>Set the NEXTAUTH_SECRET environment variable in Vercel</li>
                                )}
                                {data.envVars.NEXTAUTH_URL === undefined && (
                                    <li>Set the NEXTAUTH_URL environment variable to your deployment URL</li>
                                )}
                                {data.database.status.includes('Error') && (
                                    <li>Fix database connection: {data.database.status}</li>
                                )}
                                {data.database.userCount === 0 && (
                                    <li>Your database has no users. Make sure it's properly seeded.</li>
                                )}
                                {!data.database.availableModels?.includes('account') && (
                                    <li>
                                        The 'account' model is missing. Make sure your Prisma schema includes the NextAuth models and
                                        migrations are applied.
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 