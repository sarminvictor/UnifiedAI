'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DebugPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [showRawResult, setShowRawResult] = useState(false);

    const checkHealth = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/health-check');
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ error: String(error) });
        } finally {
            setLoading(false);
        }
    };

    const checkAuth = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/debug/auth');
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ error: String(error) });
        } finally {
            setLoading(false);
        }
    };

    const createTables = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/debug/create-nextauth-tables');
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ error: String(error) });
        } finally {
            setLoading(false);
        }
    };

    const createTablesPrisma = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/debug/create-tables-prisma');
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ error: String(error) });
        } finally {
            setLoading(false);
        }
    };

    const executeSql = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/debug/execute-sql');
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ error: String(error) });
        } finally {
            setLoading(false);
        }
    };

    const dropAndCreateTables = async () => {
        if (!confirm('WARNING: This will DROP existing NextAuth tables and recreate them. This is destructive and will remove all authentication data. Continue?')) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/debug/execute-sql?drop=true');
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ error: String(error) });
        } finally {
            setLoading(false);
        }
    };

    const initDatabase = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/debug/init-database');
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ error: String(error) });
        } finally {
            setLoading(false);
        }
    };

    const flushConnections = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/debug/flush-connections');
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ error: String(error) });
        } finally {
            setLoading(false);
        }
    };

    const prismaDirect = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/debug/prisma-direct');
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ error: String(error) });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Diagnostic Information</h1>

            <div className="mb-8">
                <Link href="/" className="text-blue-500 hover:underline">
                    Back to Home
                </Link>
                <span className="mx-2">|</span>
                <Link href="/debug/solutions.md" className="text-blue-500 hover:underline">
                    View Solution Documentation
                </Link>
            </div>

            <div className="flex flex-wrap gap-4 mb-8">
                <button
                    onClick={checkHealth}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                    Check System Health
                </button>

                <button
                    onClick={checkAuth}
                    disabled={loading}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                    Check Auth Status
                </button>

                <button
                    onClick={createTables}
                    disabled={loading}
                    className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                >
                    Create NextAuth Tables (PG)
                </button>

                <button
                    onClick={createTablesPrisma}
                    disabled={loading}
                    className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                >
                    Create NextAuth Tables (SQL)
                </button>

                <button
                    onClick={executeSql}
                    disabled={loading}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                    Execute SQL Directly
                </button>

                <button
                    onClick={dropAndCreateTables}
                    disabled={loading}
                    className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50"
                >
                    Drop & Recreate Tables
                </button>

                <button
                    onClick={initDatabase}
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
                >
                    Initialize Database (Prisma)
                </button>

                <button
                    onClick={flushConnections}
                    disabled={loading}
                    className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                >
                    Flush DB Connections
                </button>

                <button
                    onClick={prismaDirect}
                    disabled={loading}
                    className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 disabled:opacity-50"
                >
                    Prisma Direct SQL
                </button>

                <button
                    onClick={() => setShowRawResult(!showRawResult)}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                    {showRawResult ? 'Show Formatted' : 'Show Raw JSON'}
                </button>
            </div>

            {loading ? (
                <div className="p-4 border rounded bg-gray-50">
                    Loading diagnostic data...
                </div>
            ) : result ? (
                <div className="border rounded">
                    {showRawResult ? (
                        <pre className="p-4 overflow-auto whitespace-pre-wrap bg-gray-50">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    ) : (
                        <div className="p-4 bg-gray-50">
                            <h2 className="text-xl font-semibold mb-4">Diagnostic Results</h2>

                            {result.success === false ? (
                                <div className="p-3 bg-red-100 text-red-800 rounded mb-4">
                                    Error: {result.error}
                                </div>
                            ) : null}

                            {result.status && (
                                <div className="mb-4">
                                    <p className="font-semibold">Status:
                                        <span className={`ml-2 ${result.status === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                                            {result.status}
                                        </span>
                                    </p>
                                    {result.timestamp && <p>Timestamp: {new Date(result.timestamp).toLocaleString()}</p>}
                                </div>
                            )}

                            {result.prismaSettings && (
                                <div className="mb-4">
                                    <h3 className="font-semibold mb-2">Prisma Settings</h3>
                                    <ul className="list-disc pl-5">
                                        <li>Client Engine Type: <span className={result.prismaSettings.clientEngineType === 'library' ? 'text-green-600' : 'text-red-600'}>
                                            {result.prismaSettings.clientEngineType}
                                        </span></li>
                                        <li>Query Engine Type: {result.prismaSettings.queryEngineType}</li>
                                        <li>Advisory Lock: {result.prismaSettings.advisoryLock}</li>
                                    </ul>
                                </div>
                            )}

                            {result.database && (
                                <div className="mb-4">
                                    <h3 className="font-semibold mb-2">Database</h3>
                                    <p>Connected: <span className={result.database.connected ? 'text-green-600' : 'text-red-600'}>
                                        {result.database.connected ? 'Yes' : 'No'}
                                    </span></p>

                                    {result.database.error && (
                                        <div className="p-2 bg-red-100 text-red-800 rounded mt-2 text-sm">
                                            {result.database.error}
                                        </div>
                                    )}

                                    {result.database.tables && result.database.tables.length > 0 && (
                                        <div className="mt-2">
                                            <p className="font-medium">Tables:</p>
                                            <ul className="list-disc pl-5">
                                                {result.database.tables.map((table: string) => (
                                                    <li key={table}>{table}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {result.adapterStatus && (
                                <div className="mb-4">
                                    <h3 className="font-semibold mb-2">NextAuth Adapter Status</h3>
                                    <ul className="list-disc pl-5">
                                        <li>User Table: <span className={result.adapterStatus.userTableExists ? 'text-green-600' : 'text-red-600'}>
                                            {result.adapterStatus.userTableExists ? 'Exists' : 'Missing'}
                                        </span></li>
                                        <li>Account Table: <span className={result.adapterStatus.accountTableExists ? 'text-green-600' : 'text-red-600'}>
                                            {result.adapterStatus.accountTableExists ? 'Exists' : 'Missing'}
                                        </span></li>
                                        <li>Session Table: <span className={result.adapterStatus.sessionTableExists ? 'text-green-600' : 'text-red-600'}>
                                            {result.adapterStatus.sessionTableExists ? 'Exists' : 'Missing'}
                                        </span></li>
                                        <li>Verification Token Table: <span className={result.adapterStatus.verificationTokenTableExists ? 'text-green-600' : 'text-red-600'}>
                                            {result.adapterStatus.verificationTokenTableExists ? 'Exists' : 'Missing'}
                                        </span></li>
                                    </ul>
                                </div>
                            )}

                            {result.recommendations && result.recommendations.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="font-semibold mb-2">Recommendations</h3>
                                    <ul className="list-disc pl-5">
                                        {result.recommendations.map((rec: string, i: number) => (
                                            <li key={i} className="text-orange-700">{rec}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.results && (
                                <div className="mb-4">
                                    <h3 className="font-semibold mb-2">Table Creation Results</h3>
                                    <ul className="list-disc pl-5">
                                        {result.results.map((res: any, i: number) => (
                                            <li key={i} className={res.success ? 'text-green-600' : 'text-orange-600'}>
                                                {res.description}: {res.success ? 'Success' : res.alreadyExists ? 'Already exists' : `Failed - ${res.error}`}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-4 border rounded bg-gray-50">
                    Click a button above to check system status.
                </div>
            )}
        </div>
    );
} 