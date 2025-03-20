'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PrismaDebugPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPrismaData() {
            try {
                setLoading(true);
                const response = await fetch('/api/debug/prisma-test');
                if (!response.ok) {
                    throw new Error(`API responded with status ${response.status}`);
                }
                const result = await response.json();
                setData(result);
                setError(null);
            } catch (err: any) {
                console.error('Error fetching Prisma data:', err);
                setError(err.message || 'Unknown error occurred');
            } finally {
                setLoading(false);
            }
        }

        fetchPrismaData();
    }, []);

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <div className="mb-4">
                <Link href="/debug" className="text-blue-500 hover:underline">
                    &larr; Back to Debug
                </Link>
            </div>

            <h1 className="text-2xl font-bold mb-6">Prisma Database Diagnostics</h1>

            {loading && (
                <div className="flex justify-center my-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <p className="font-bold">Error!</p>
                    <p>{error}</p>
                </div>
            )}

            {data && (
                <div className="space-y-6">
                    <div className="bg-gray-100 p-4 rounded border">
                        <h2 className="text-lg font-semibold mb-2">System Information</h2>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="text-gray-600">Timestamp:</div>
                            <div>{data.timestamp}</div>
                            <div className="text-gray-600">Prisma Version:</div>
                            <div>{data.prismaVersion}</div>
                            <div className="text-gray-600">Database Type:</div>
                            <div>{data.databaseType}</div>
                            <div className="text-gray-600">Total Test Duration:</div>
                            <div>{data.totalDuration}ms</div>
                        </div>
                    </div>

                    <StatusCard
                        title="Database Connection Test"
                        status={data.connectionTest.status}
                        duration={data.connectionTest.duration}
                    >
                        {data.connectionTest.status === 'success' ? (
                            <div className="text-green-600">Connected successfully</div>
                        ) : (
                            <div className="text-red-600">
                                <p>Error: {data.connectionTest.message}</p>
                                {data.connectionTest.code && <p>Code: {data.connectionTest.code}</p>}
                            </div>
                        )}

                        {data.databaseUrl && (
                            <div className="mt-2">
                                <p className="text-sm text-gray-600">Connection URL (redacted):</p>
                                <p className="text-sm font-mono break-all">{data.databaseUrl}</p>
                            </div>
                        )}
                    </StatusCard>

                    <StatusCard
                        title="NextAuth.js Adapter Test"
                        status={data.adapterTest.status}
                        duration={data.adapterTest.duration}
                    >
                        {data.adapterTest.status === 'success' ? (
                            <div>
                                <p className="text-green-600">Adapter created successfully</p>
                                <p className="text-sm mt-2">Available methods:</p>
                                <div className="grid grid-cols-2 gap-1 mt-1">
                                    {data.adapterTest.methods.map((method: string) => (
                                        <div key={method} className="text-xs bg-gray-100 p-1 rounded">
                                            {method}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-red-600">
                                <p>Error: {data.adapterTest.message}</p>
                            </div>
                        )}
                    </StatusCard>

                    <StatusCard
                        title="User Schema & Operations"
                        status={data.userTests.status}
                        duration={data.userTests.duration}
                    >
                        {data.userTests.status === 'success' ? (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold">User Count</h3>
                                    <p>{data.userTests.tests.count.count} users in database</p>
                                </div>

                                {data.userTests.tests.schema && (
                                    <div>
                                        <h3 className="font-semibold">User Schema</h3>
                                        {data.userTests.tests.schema.status === 'success' ? (
                                            <div>
                                                <p className="mb-1">Fields available:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {data.userTests.tests.schema.fields.map((field: string) => (
                                                        <span key={field} className="text-xs bg-gray-100 p-1 rounded">
                                                            {field}
                                                        </span>
                                                    ))}
                                                </div>
                                                <p className="mt-2 text-sm">
                                                    Has password field: {data.userTests.tests.schema.hasPasswordField ? 'Yes' : 'No'}
                                                </p>
                                            </div>
                                        ) : (
                                            <p>{data.userTests.tests.schema.reason}</p>
                                        )}
                                    </div>
                                )}

                                {data.userTests.tests.passwordHash && (
                                    <div>
                                        <h3 className="font-semibold">Password Hashing</h3>
                                        <p>Bcrypt working: {data.userTests.tests.passwordHash.hashWorking ? 'Yes' : 'No'}</p>
                                        <p>Hash length: {data.userTests.tests.passwordHash.hashLength} characters</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-red-600">
                                <p>Error: {data.userTests.error?.message}</p>
                                {data.userTests.error?.code && <p>Code: {data.userTests.error.code}</p>}
                            </div>
                        )}
                    </StatusCard>

                    <StatusCard
                        title="Database Schema"
                        status={data.schemaInfo.status}
                        duration={data.schemaInfo.duration}
                    >
                        {data.schemaInfo.status === 'success' ? (
                            <div>
                                <h3 className="font-semibold mb-2">Latest Migrations</h3>
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="text-left p-2">Migration Name</th>
                                            <th className="text-left p-2">Applied Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.schemaInfo.latestMigrations.map((migration: any, index: number) => (
                                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="p-2 font-mono">{migration.migration_name}</td>
                                                <td className="p-2">
                                                    {new Date(migration.finished_at).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-red-600">
                                <p>Error: {data.schemaInfo.message}</p>
                                {data.schemaInfo.code && <p>Code: {data.schemaInfo.code}</p>}
                            </div>
                        )}
                    </StatusCard>

                    <div className="mt-6">
                        <h3 className="font-semibold mb-2">Raw Response Data:</h3>
                        <pre className="bg-gray-800 text-green-400 p-4 rounded overflow-x-auto text-xs">
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusCard({
    title,
    status,
    duration,
    children
}: {
    title: string;
    status: string;
    duration?: number;
    children: React.ReactNode
}) {
    const statusColors = {
        success: 'bg-green-100 border-green-200',
        error: 'bg-red-100 border-red-200',
        pending: 'bg-yellow-100 border-yellow-200',
        skipped: 'bg-gray-100 border-gray-200',
    };

    const colorClass = statusColors[status as keyof typeof statusColors] || 'bg-gray-100 border-gray-200';

    return (
        <div className={`p-4 rounded border ${colorClass}`}>
            <div className="flex justify-between mb-2">
                <h2 className="text-lg font-semibold">{title}</h2>
                <div className="flex items-center">
                    <StatusBadge status={status} />
                    {duration && <span className="text-xs text-gray-500 ml-2">{duration}ms</span>}
                </div>
            </div>
            <div>{children}</div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        success: 'bg-green-100 text-green-800 border-green-200',
        error: 'bg-red-100 text-red-800 border-red-200',
        pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        skipped: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    const styleClass = styles[status as keyof typeof styles] || styles.pending;

    return (
        <span className={`text-xs px-2 py-1 rounded border ${styleClass}`}>
            {status}
        </span>
    );
} 