'use client';

import { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle, XCircle, Database, Server, KeyRound, Cable } from 'lucide-react';

// Simple HTML-based components without dependencies
const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ children }: { children: React.ReactNode }) => (
    <div className="p-4 border-b border-gray-200">
        {children}
    </div>
);

const CardTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <h3 className={`text-lg font-medium ${className}`}>{children}</h3>
);

const CardDescription = ({ children }: { children: React.ReactNode }) => (
    <p className="text-sm text-gray-500 mt-1">{children}</p>
);

const CardContent = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`p-4 ${className}`}>{children}</div>
);

const CardFooter = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`p-4 border-t border-gray-200 ${className}`}>{children}</div>
);

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: string }) => {
    const variants: Record<string, string> = {
        default: 'bg-gray-100 text-gray-800',
        outline: 'bg-white text-gray-800 border border-gray-300',
        success: 'bg-green-100 text-green-800',
        destructive: 'bg-red-100 text-red-800',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant] || variants.default}`}>
            {children}
        </span>
    );
};

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
    nextAuthLogs?: {
        status: 'success' | 'error' | 'loading';
        logs?: string[];
        errors?: string[];
        recommendations?: string[];
        diagnostics?: {
            adapter?: { status: string };
            authOptions?: { status: string };
            environmentComplete?: boolean;
        };
        error?: string;
    };
    userSchema?: {
        status: 'success' | 'error' | 'loading';
        userTableSchema?: {
            columns?: any[];
            primaryKey?: string | null;
            missingAuthColumns?: string[];
            canRelateToAccount?: boolean;
        };
        recommendations?: string[];
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
        nextAuthDiagnostics: { status: 'loading' },
        nextAuthLogs: { status: 'loading' },
        userSchema: { status: 'loading' }
    });

    const [showEnvVars, setShowEnvVars] = useState(false);

    const [migrationStatus, setMigrationStatus] = useState({
        loading: false,
        success: false,
        error: null as string | null,
        results: [] as any[]
    });

    const [userColumnStatus, setUserColumnStatus] = useState({
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
            const response = await fetch('/api/debug/direct-migration', {
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

    const checkNextAuthLogs = async () => {
        setInfo(prev => ({
            ...prev,
            nextAuthLogs: { status: 'loading' }
        }));

        try {
            const response = await fetch('/api/debug/nextauth-logs');
            const data = await response.json();

            if (data.error) {
                setInfo(prev => ({
                    ...prev,
                    nextAuthLogs: {
                        status: 'error',
                        error: data.error
                    }
                }));
            } else {
                setInfo(prev => ({
                    ...prev,
                    nextAuthLogs: {
                        status: 'success',
                        logs: data.logs,
                        errors: data.errors,
                        recommendations: data.recommendations,
                        diagnostics: data.diagnostics
                    }
                }));
            }
        } catch (error: any) {
            setInfo(prev => ({
                ...prev,
                nextAuthLogs: {
                    status: 'error',
                    error: error.message
                }
            }));
        }
    };

    const checkUserSchema = async () => {
        setInfo(prev => ({
            ...prev,
            userSchema: { status: 'loading' }
        }));

        try {
            const response = await fetch('/api/debug/check-user-schema');
            const data = await response.json();

            if (data.error) {
                setInfo(prev => ({
                    ...prev,
                    userSchema: {
                        status: 'error',
                        error: data.error
                    }
                }));
            } else {
                setInfo(prev => ({
                    ...prev,
                    userSchema: {
                        status: 'success',
                        userTableSchema: data.userTableSchema,
                        recommendations: data.recommendations
                    }
                }));
            }
        } catch (error: any) {
            setInfo(prev => ({
                ...prev,
                userSchema: {
                    status: 'error',
                    error: error.message
                }
            }));
        }
    };

    const addMissingColumns = async () => {
        setUserColumnStatus({
            loading: true,
            success: false,
            error: null,
            results: []
        });

        try {
            const response = await fetch('/api/debug/add-missing-columns', {
                method: 'POST'
            });
            const data = await response.json();

            if (data.error) {
                setUserColumnStatus({
                    loading: false,
                    success: false,
                    error: data.error,
                    results: []
                });
            } else {
                setUserColumnStatus({
                    loading: false,
                    success: true,
                    error: null,
                    results: data.results || []
                });

                // Refresh the user schema
                setTimeout(() => {
                    checkUserSchema();
                }, 1000);
            }
        } catch (error: any) {
            setUserColumnStatus({
                loading: false,
                success: false,
                error: error.message,
                results: []
            });
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-5xl">
            <h1 className="text-3xl font-bold mb-6">System Diagnostics</h1>

            {/* System Info Section */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Server size={20} />
                        System Information
                    </CardTitle>
                    <CardDescription>
                        Details about the current environment and system
                    </CardDescription>
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

            {/* Database Section */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database size={20} />
                        Database Connection
                    </CardTitle>
                    <CardDescription>
                        Status of the PostgreSQL database connection
                    </CardDescription>
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
                <CardFooter>
                    <Link href="/debug/prisma">
                        <Button variant="outline">View Detailed Prisma Diagnostics</Button>
                    </Link>
                </CardFooter>
            </Card>

            {/* Authentication Section */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <KeyRound size={20} />
                        Authentication
                    </CardTitle>
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
                        <div className="space-y-4">
                            <div>No active session. Sign in to create the first account.</div>

                            {/* Database tables status summary */}
                            <div className="mt-2 border-t pt-2">
                                <div className="font-medium mb-1">Auth Readiness:</div>
                                <ul className="space-y-1 text-sm pl-2">
                                    <li className={info.prismaTest?.connectionTest ? "text-green-500" : "text-red-500"}>
                                        {info.prismaTest?.connectionTest ? "✓" : "✗"} Database Connection
                                    </li>

                                    <li className={info.nextAuthDiagnostics?.schema?.missing?.length === 0 ? "text-green-500" : "text-red-500"}>
                                        {info.nextAuthDiagnostics?.schema?.missing?.length === 0 ? "✓" : "✗"} NextAuth Tables
                                        {info.nextAuthDiagnostics?.schema?.missing && info.nextAuthDiagnostics.schema.missing.length > 0 &&
                                            <span className="text-amber-600"> (Run 'Apply NextAuth Tables' in diagnostics)</span>}
                                    </li>

                                    <li className={!info.userSchema?.userTableSchema?.missingAuthColumns?.length ? "text-green-500" : "text-amber-600"}>
                                        {!info.userSchema?.userTableSchema?.missingAuthColumns?.length ? "✓" : "⚠️"} User Schema Compatibility
                                        {info.userSchema?.userTableSchema?.missingAuthColumns && info.userSchema.userTableSchema.missingAuthColumns.length > 0 &&
                                            <span> (Add missing columns in User Schema section)</span>}
                                    </li>
                                </ul>
                            </div>

                            <div className="mt-2 border-t pt-2 text-sm">
                                <strong>Next steps:</strong> Once all auth requirements are met, click 'Sign In' to
                                create the first user and establish the auth tables properly.
                            </div>
                        </div>
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
                <CardFooter className="flex justify-between">
                    <Link href="/api/auth/signin">
                        <Button variant="outline">Test Sign In</Button>
                    </Link>
                    <Link href="/debug/auth">
                        <Button variant="outline">Authentication Diagnostics</Button>
                    </Link>
                    <Link href="/api/auth/signout">
                        <Button variant="outline">Test Sign Out</Button>
                    </Link>
                </CardFooter>
            </Card>

            {/* API Endpoints Section */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>API Endpoints</CardTitle>
                    <CardDescription>Test and view API endpoint responses</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>
        </div>
    );
} 