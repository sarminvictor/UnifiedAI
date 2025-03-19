'use client';

import { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';

// Simple HTML-based components without dependencies
const Card = ({ children, className = '', ...props }: any) => (
    <div className={`border rounded-lg shadow p-4 mb-4 ${className}`} {...props}>
        {children}
    </div>
);

const CardHeader = ({ children }: any) => <div className="mb-3">{children}</div>;
const CardTitle = ({ children }: any) => <h3 className="text-xl font-bold">{children}</h3>;
const CardDescription = ({ children }: any) => <p className="text-gray-500 text-sm">{children}</p>;
const CardContent = ({ children }: any) => <div>{children}</div>;

const Badge = ({ children, variant = '' }: any) => (
    <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold 
    ${variant === 'success' ? 'bg-green-100 text-green-800' :
            variant === 'destructive' ? 'bg-red-100 text-red-800' :
                variant === 'secondary' ? 'bg-gray-100 text-gray-800' :
                    'bg-blue-100 text-blue-800'}`}>
        {children}
    </span>
);

const Button = ({ children, onClick, disabled = false, className = '', variant = 'default' }: any) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`${className} py-2 px-4 rounded text-sm font-medium disabled:opacity-50
      ${variant === 'outline' ? 'border border-gray-300 bg-white hover:bg-gray-50' :
                'bg-gray-800 text-white hover:bg-gray-700'}`}>
        {children}
    </button>
);

const Separator = () => <hr className="my-8" />;

// Simple Accordion implementation
const Accordion = ({ children, type = 'single', ...props }: any) => <div {...props}>{children}</div>;
const AccordionItem = ({ children, value, ...props }: any) => <div className="border-b" {...props}>{children}</div>;
const AccordionTrigger = ({ children, ...props }: any) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="py-4">
            <button
                className="flex w-full justify-between font-medium"
                onClick={() => setOpen(!open)}
                {...props}
            >
                {children}
                <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {open && props.children}
        </div>
    );
};
const AccordionContent = ({ children, ...props }: any) => <div className="pb-4 pt-2 pl-4" {...props}>{children}</div>;

interface SystemInfo {
    nextVersion: string;
    nodeVersion: string;
    environment: string;
    buildTime: string;
    vercelRegion?: string;
    database: {
        status: 'connected' | 'error' | 'loading';
        error?: string;
        version?: string;
        tables?: string[];
    };
    auth: {
        status: 'authenticated' | 'unauthenticated' | 'loading';
        session?: any;
        providers?: string[];
    };
    environment_variables: {
        [key: string]: string | undefined;
    };
    apis: {
        [key: string]: {
            status: 'ok' | 'error' | 'loading';
            response?: any;
            error?: string;
            latency?: number;
        };
    };
    prismaTest?: {
        status: 'success' | 'error' | 'loading';
        connectionTest?: boolean;
        adapterTest?: {
            success: boolean;
            error: string | null;
        };
        userTest?: {
            success: boolean;
            error: string | null;
            methods?: any;
        };
        schemaVersion?: string;
        prismaVersion?: string;
        error?: string;
    };
    nextAuthDiagnostics?: {
        status: 'success' | 'error' | 'loading';
        adapter?: {
            success: boolean;
            methods?: string[];
            error?: string;
        };
        config?: {
            success: boolean;
            config?: {
                present: string[];
                missing: string[];
            };
            error?: string;
        };
        schema?: {
            success: boolean;
            available?: string[];
            missing?: string[];
            error?: string;
        };
        fixes_applied?: string[];
        error?: string;
    };
}

export default function DebugPage() {
    const [info, setInfo] = useState<SystemInfo>({
        nextVersion: 'loading...',
        nodeVersion: 'loading...',
        environment: 'loading...',
        buildTime: 'loading...',
        database: { status: 'loading' },
        auth: { status: 'loading' },
        environment_variables: {},
        apis: {
            auth: { status: 'loading' },
            webhook: { status: 'loading' },
            reset_password: { status: 'loading' },
        },
        prismaTest: { status: 'loading' },
        nextAuthDiagnostics: { status: 'loading' }
    });

    const [showEnvVars, setShowEnvVars] = useState(false);

    const [migrationStatus, setMigrationStatus] = useState({
        loading: false,
        success: false,
        error: null as string | null,
        results: [] as any[]
    });

    useEffect(() => {
        const fetchSystemInfo = async () => {
            try {
                const response = await fetch('/api/debug/system-info');
                const data = await response.json();
                setInfo(data);
            } catch (error) {
                console.error('Failed to fetch system info:', error);
            }
        };

        const checkAuth = async () => {
            try {
                const session = await getSession();
                setInfo(prev => ({
                    ...prev,
                    auth: {
                        ...prev.auth,
                        status: session ? 'authenticated' : 'unauthenticated',
                        session
                    }
                }));
            } catch (error) {
                console.error('Failed to check auth:', error);
            }
        };

        fetchSystemInfo();
        checkAuth();
    }, []);

    const testEndpoint = async (endpoint: string) => {
        setInfo(prev => ({
            ...prev,
            apis: {
                ...prev.apis,
                [endpoint]: { status: 'loading' }
            }
        }));

        try {
            const startTime = performance.now();
            const response = await fetch(`/api/debug/test-endpoint?endpoint=${endpoint}`);
            const endTime = performance.now();
            const data = await response.json();

            setInfo(prev => ({
                ...prev,
                apis: {
                    ...prev.apis,
                    [endpoint]: {
                        status: 'ok',
                        response: data,
                        latency: Math.round(endTime - startTime)
                    }
                }
            }));
        } catch (error: any) {
            setInfo(prev => ({
                ...prev,
                apis: {
                    ...prev.apis,
                    [endpoint]: {
                        status: 'error',
                        error: error.message
                    }
                }
            }));
        }
    };

    const testDatabase = async () => {
        setInfo(prev => ({
            ...prev,
            database: { status: 'loading' }
        }));

        try {
            const response = await fetch('/api/debug/test-database');
            const data = await response.json();

            setInfo(prev => ({
                ...prev,
                database: {
                    status: 'connected',
                    version: data.version,
                    tables: data.tables
                }
            }));
        } catch (error: any) {
            setInfo(prev => ({
                ...prev,
                database: {
                    status: 'error',
                    error: error.message
                }
            }));
        }
    };

    const testPrismaAdapter = async () => {
        setInfo(prev => ({
            ...prev,
            prismaTest: { status: 'loading' }
        }));

        try {
            const response = await fetch('/api/debug/prisma-test');
            const data = await response.json();

            if (data.error) {
                setInfo(prev => ({
                    ...prev,
                    prismaTest: {
                        status: 'error',
                        error: data.error
                    }
                }));
            } else {
                setInfo(prev => ({
                    ...prev,
                    prismaTest: {
                        status: 'success',
                        connectionTest: data.connectionTest,
                        adapterTest: data.adapterTest,
                        userTest: data.userTest,
                        schemaVersion: data.schemaVersion,
                        prismaVersion: data.prismaVersion
                    }
                }));
            }
        } catch (error: any) {
            setInfo(prev => ({
                ...prev,
                prismaTest: {
                    status: 'error',
                    error: error.message
                }
            }));
        }
    };

    const diagnoseNextAuth = async () => {
        setInfo(prev => ({
            ...prev,
            nextAuthDiagnostics: { status: 'loading' }
        }));

        try {
            const response = await fetch('/api/debug/fix-nextauth');
            const data = await response.json();

            if (data.error) {
                setInfo(prev => ({
                    ...prev,
                    nextAuthDiagnostics: {
                        status: 'error',
                        error: data.error
                    }
                }));
            } else {
                setInfo(prev => ({
                    ...prev,
                    nextAuthDiagnostics: {
                        status: 'success',
                        adapter: data.diagnostics.adapter,
                        config: data.diagnostics.config,
                        schema: data.diagnostics.schema,
                        fixes_applied: data.diagnostics.fixes_applied
                    }
                }));
            }
        } catch (error: any) {
            setInfo(prev => ({
                ...prev,
                nextAuthDiagnostics: {
                    status: 'error',
                    error: error.message
                }
            }));
        }
    };

    const applyMigrations = async () => {
        setMigrationStatus({
            loading: true,
            success: false,
            error: null,
            results: []
        });

        try {
            const response = await fetch('/api/debug/apply-migrations', {
                method: 'POST'
            });
            const data = await response.json();

            if (data.error) {
                setMigrationStatus({
                    loading: false,
                    success: false,
                    error: data.error,
                    results: []
                });
            } else {
                setMigrationStatus({
                    loading: false,
                    success: true,
                    error: null,
                    results: data.results || []
                });

                // Refresh the NextAuth diagnostics
                diagnoseNextAuth();
            }
        } catch (error: any) {
            setMigrationStatus({
                loading: false,
                success: false,
                error: error.message,
                results: []
            });
        }
    };

    return (
        <div className="container mx-auto py-10 space-y-8">
            <h1 className="text-4xl font-bold">System Debug Dashboard</h1>
            <p className="text-gray-500">
                This page provides detailed diagnostic information about your application's connections and configuration.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* System Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>System Information</CardTitle>
                        <CardDescription>Basic information about the running system</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="font-medium">Next.js Version:</span>
                                <span>{info.nextVersion}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Node.js Version:</span>
                                <span>{info.nodeVersion}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Environment:</span>
                                <span>
                                    <Badge variant={info.environment === 'production' ? 'default' : 'outline'}>
                                        {info.environment}
                                    </Badge>
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Build Time:</span>
                                <span>{info.buildTime}</span>
                            </div>
                            {info.vercelRegion && (
                                <div className="flex justify-between">
                                    <span className="font-medium">Vercel Region:</span>
                                    <span>{info.vercelRegion}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Database Status */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Database Connection</CardTitle>
                            <Badge
                                variant={
                                    info.database.status === 'connected'
                                        ? 'success'
                                        : info.database.status === 'error'
                                            ? 'destructive'
                                            : 'outline'
                                }
                            >
                                {info.database.status}
                            </Badge>
                        </div>
                        <CardDescription>Database connection status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {info.database.status === 'connected' ? (
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="font-medium">PostgreSQL Version:</span>
                                    <span>{info.database.version}</span>
                                </div>
                                <div>
                                    <div className="font-medium mb-2">Tables ({info.database.tables?.length || 0})</div>
                                    <ul className="space-y-1 text-sm">
                                        {info.database.tables?.map((table, i) => (
                                            <li key={i}>{table}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : info.database.status === 'error' ? (
                            <div className="text-red-500">{info.database.error}</div>
                        ) : (
                            <div className="animate-pulse">Testing database connection...</div>
                        )}
                        <Button
                            onClick={testDatabase}
                            className="w-full mt-4"
                            variant="outline"
                            disabled={info.database.status === 'loading'}
                        >
                            Test Database Connection
                        </Button>
                    </CardContent>
                </Card>

                {/* Authentication Status */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Authentication</CardTitle>
                            <Badge
                                variant={
                                    info.auth.status === 'authenticated'
                                        ? 'success'
                                        : info.auth.status === 'unauthenticated'
                                            ? 'secondary'
                                            : 'outline'
                                }
                            >
                                {info.auth.status}
                            </Badge>
                        </div>
                        <CardDescription>NextAuth.js authentication status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {info.auth.status === 'authenticated' ? (
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="font-medium">User:</span>
                                    <span>{info.auth.session?.user?.email || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium">Session Expires:</span>
                                    <span>{info.auth.session?.expires ? new Date(info.auth.session.expires).toLocaleString() : 'Unknown'}</span>
                                </div>
                            </div>
                        ) : info.auth.status === 'unauthenticated' ? (
                            <div>No active session</div>
                        ) : (
                            <div className="animate-pulse">Checking authentication...</div>
                        )}
                        <Button
                            onClick={() => window.location.href = '/api/auth/signin'}
                            className="w-full mt-4"
                            variant="outline"
                        >
                            Sign In
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Prisma Adapter Test */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Prisma Adapter Test</CardTitle>
                        <Badge
                            variant={
                                info.prismaTest?.status === 'success'
                                    ? 'success'
                                    : info.prismaTest?.status === 'error'
                                        ? 'destructive'
                                        : 'outline'
                            }
                        >
                            {info.prismaTest?.status || 'Not Tested'}
                        </Badge>
                    </div>
                    <CardDescription>Tests for Prisma client and NextAuth adapter</CardDescription>
                </CardHeader>
                <CardContent>
                    {info.prismaTest?.status === 'success' ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="font-medium">Connection Test:</div>
                                <div>{info.prismaTest.connectionTest ? '✅ Connected' : '❌ Failed'}</div>

                                <div className="font-medium">Adapter Test:</div>
                                <div>
                                    {info.prismaTest.adapterTest?.success ?
                                        '✅ Adapter Created' :
                                        `❌ Error: ${info.prismaTest.adapterTest?.error}`}
                                </div>

                                <div className="font-medium">User Test:</div>
                                <div>
                                    {info.prismaTest.userTest?.success ?
                                        '✅ User Table Accessible' :
                                        `❌ Error: ${info.prismaTest.userTest?.error}`}
                                </div>

                                <div className="font-medium">Prisma Version:</div>
                                <div>{info.prismaTest.prismaVersion}</div>

                                <div className="font-medium">Schema Version:</div>
                                <div>{info.prismaTest.schemaVersion}</div>
                            </div>

                            {info.prismaTest.userTest?.methods && (
                                <div>
                                    <div className="font-medium mb-2">User Methods Test:</div>
                                    <div className="pl-4 space-y-2 text-sm">
                                        <div>User Count: {info.prismaTest.userTest.methods.count}</div>
                                        <div>Find First: {info.prismaTest.userTest.methods.findFirst ? '✅ Working' : '❌ Failed'}</div>
                                        <div>
                                            User By Account: {
                                                info.prismaTest.userTest.methods.userByAccount?.success ?
                                                    '✅ Working' :
                                                    info.prismaTest.userTest.methods.userByAccount?.error?.includes('prisma.account') ?
                                                        '⚠️ Account table missing (expected for new setup)' :
                                                        `❌ Error: ${info.prismaTest.userTest.methods.userByAccount?.error}`
                                            }
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : info.prismaTest?.status === 'error' ? (
                        <div className="text-red-500">{info.prismaTest.error}</div>
                    ) : (
                        <div className="animate-pulse">Click the button to test Prisma adapter...</div>
                    )}
                    <Button
                        onClick={testPrismaAdapter}
                        className="w-full mt-4"
                        variant="outline"
                        disabled={info.prismaTest?.status === 'loading'}
                    >
                        Test Prisma Adapter
                    </Button>
                </CardContent>
            </Card>

            {/* NextAuth Diagnostics */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>NextAuth Diagnostics</CardTitle>
                        <Badge
                            variant={
                                info.nextAuthDiagnostics?.status === 'success'
                                    ? 'success'
                                    : info.nextAuthDiagnostics?.status === 'error'
                                        ? 'destructive'
                                        : 'outline'
                            }
                        >
                            {info.nextAuthDiagnostics?.status || 'Not Tested'}
                        </Badge>
                    </div>
                    <CardDescription>Diagnose and fix common NextAuth configuration issues</CardDescription>
                </CardHeader>
                <CardContent>
                    {info.nextAuthDiagnostics?.status === 'success' ? (
                        <div className="space-y-4">
                            {/* Adapter Check */}
                            <div>
                                <div className="font-medium flex items-center mb-2">
                                    <span>PrismaAdapter:</span>
                                    <Badge
                                        variant={info.nextAuthDiagnostics.adapter?.success ? 'success' : 'destructive'}
                                        className="ml-2"
                                    >
                                        {info.nextAuthDiagnostics.adapter?.success ? 'OK' : 'Issue Detected'}
                                    </Badge>
                                </div>
                                {info.nextAuthDiagnostics.adapter?.error ? (
                                    <div className="text-red-500 text-sm">{info.nextAuthDiagnostics.adapter.error}</div>
                                ) : (
                                    <div className="text-sm pl-4">
                                        <div>Available Methods: {info.nextAuthDiagnostics.adapter?.methods?.join(', ')}</div>
                                    </div>
                                )}
                            </div>

                            {/* Config Check */}
                            <div>
                                <div className="font-medium flex items-center mb-2">
                                    <span>Auth Configuration:</span>
                                    <Badge
                                        variant={info.nextAuthDiagnostics.config?.success ? 'success' : 'destructive'}
                                        className="ml-2"
                                    >
                                        {info.nextAuthDiagnostics.config?.success ? 'OK' : 'Issue Detected'}
                                    </Badge>
                                </div>
                                {info.nextAuthDiagnostics.config?.error ? (
                                    <div className="text-red-500 text-sm">{info.nextAuthDiagnostics.config.error}</div>
                                ) : (
                                    <div className="text-sm pl-4">
                                        <div>Present: {info.nextAuthDiagnostics.config?.config?.present.join(', ')}</div>
                                        {info.nextAuthDiagnostics.config?.config?.missing.length ? (
                                            <div className="text-red-500">Missing: {info.nextAuthDiagnostics.config?.config?.missing.join(', ')}</div>
                                        ) : null}
                                    </div>
                                )}
                            </div>

                            {/* Schema Check */}
                            <div>
                                <div className="font-medium flex items-center mb-2">
                                    <span>Database Schema:</span>
                                    <Badge
                                        variant={info.nextAuthDiagnostics.schema?.success ? 'success' : 'destructive'}
                                        className="ml-2"
                                    >
                                        {info.nextAuthDiagnostics.schema?.success ? 'OK' : 'Issue Detected'}
                                    </Badge>
                                </div>
                                {info.nextAuthDiagnostics.schema?.error ? (
                                    <div className="text-red-500 text-sm">{info.nextAuthDiagnostics.schema.error}</div>
                                ) : (
                                    <div className="text-sm pl-4">
                                        {info.nextAuthDiagnostics.schema?.missing?.length ? (
                                            <div className="text-red-500">
                                                Missing Tables: {info.nextAuthDiagnostics.schema?.missing.join(', ')}
                                            </div>
                                        ) : (
                                            <div>All required tables present</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Fixes */}
                            {info.nextAuthDiagnostics.fixes_applied?.length ? (
                                <div>
                                    <div className="font-medium mb-2">Recommended Fixes:</div>
                                    <ul className="list-disc pl-5 text-sm space-y-1">
                                        {info.nextAuthDiagnostics.fixes_applied.map((fix, index) => (
                                            <li key={index} className="text-amber-600">{fix}</li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}

                            {/* Migration Button */}
                            {info.nextAuthDiagnostics?.schema?.missing?.length ? (
                                <div className="mt-6 border-t pt-4">
                                    <div className="font-medium mb-2">Apply Missing Table Migrations</div>
                                    <p className="text-sm text-gray-500 mb-3">
                                        Create the required NextAuth tables in your database
                                    </p>

                                    {migrationStatus.error && (
                                        <div className="text-red-500 text-sm mb-3">{migrationStatus.error}</div>
                                    )}

                                    {migrationStatus.success && (
                                        <div className="text-green-500 text-sm mb-3">Migration applied successfully!</div>
                                    )}

                                    {migrationStatus.results.length > 0 && (
                                        <div className="mb-3 text-sm">
                                            <div className="font-medium mb-1">Results:</div>
                                            <ul className="space-y-1">
                                                {migrationStatus.results.map((result, idx) => (
                                                    <li key={idx} className={result.status === 'success' ? 'text-green-500' : 'text-red-500'}>
                                                        {result.sql} - {result.status}
                                                        {result.error ? `: ${result.error}` : ''}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <Button
                                        onClick={applyMigrations}
                                        className="w-full"
                                        variant="outline"
                                        disabled={migrationStatus.loading}
                                    >
                                        {migrationStatus.loading ? 'Applying Migrations...' : 'Apply NextAuth Migrations'}
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    ) : info.nextAuthDiagnostics?.status === 'error' ? (
                        <div className="text-red-500">{info.nextAuthDiagnostics.error}</div>
                    ) : (
                        <div className="animate-pulse">Click the button to diagnose NextAuth issues...</div>
                    )}
                    <Button
                        onClick={diagnoseNextAuth}
                        className="w-full mt-4"
                        variant="outline"
                        disabled={info.nextAuthDiagnostics?.status === 'loading'}
                    >
                        Diagnose NextAuth Issues
                    </Button>
                </CardContent>
            </Card>

            <Separator />

            {/* API Endpoints */}
            <div>
                <h2 className="text-2xl font-bold mb-4">API Endpoints</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(info.apis).map(([endpoint, data]) => (
                        <Card key={endpoint}>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>{endpoint}</CardTitle>
                                    <Badge
                                        variant={
                                            data.status === 'ok'
                                                ? 'success'
                                                : data.status === 'error'
                                                    ? 'destructive'
                                                    : 'outline'
                                        }
                                    >
                                        {data.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {data.status === 'ok' ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="font-medium">Latency:</span>
                                            <span>{data.latency}ms</span>
                                        </div>
                                        <div>
                                            <div className="font-medium mb-2">Response</div>
                                            <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                                                {JSON.stringify(data.response, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                ) : data.status === 'error' ? (
                                    <div className="text-red-500">{data.error}</div>
                                ) : (
                                    <div className="animate-pulse">Testing endpoint...</div>
                                )}
                                <Button
                                    onClick={() => testEndpoint(endpoint)}
                                    className="w-full mt-4"
                                    variant="outline"
                                    disabled={data.status === 'loading'}
                                >
                                    Test Endpoint
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <Separator />

            {/* Environment Variables */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Environment Variables</h2>
                    <Button
                        onClick={() => setShowEnvVars(!showEnvVars)}
                        variant="outline"
                    >
                        {showEnvVars ? 'Hide' : 'Show'} Environment Variables
                    </Button>
                </div>
                {showEnvVars && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="space-y-2">
                                {Object.entries(info.environment_variables).length > 0 ? (
                                    Object.entries(info.environment_variables).map(([key, value]) => (
                                        <div key={key} className="flex justify-between items-start border-b pb-2">
                                            <span className="font-medium">{key}:</span>
                                            <span className="max-w-md break-all">
                                                {value ? (
                                                    key.includes('KEY') || key.includes('SECRET') || key.includes('PASSWORD')
                                                        ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
                                                        : value
                                                ) : 'Not set'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-4">No environment variables available</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
} 