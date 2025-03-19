'use client';

import { useState, useEffect } from 'react';
import { PrismaClient } from '@prisma/client';
import { getSession } from 'next-auth/react';

// Define fallback components in case the UI components aren't available
const FallbackCard = ({ children, className = '', ...props }: any) => (
    <div className={`border rounded-lg shadow p-4 mb-4 ${className}`} {...props}>
        {children}
    </div>
);

const FallbackCardHeader = ({ children }: any) => <div className="mb-3">{children}</div>;
const FallbackCardTitle = ({ children }: any) => <h3 className="text-xl font-bold">{children}</h3>;
const FallbackCardDescription = ({ children }: any) => <p className="text-gray-500 text-sm">{children}</p>;
const FallbackCardContent = ({ children }: any) => <div>{children}</div>;
const FallbackBadge = ({ children, variant = '' }: any) => (
    <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold 
    ${variant === 'success' ? 'bg-green-100 text-green-800' :
            variant === 'destructive' ? 'bg-red-100 text-red-800' :
                variant === 'secondary' ? 'bg-gray-100 text-gray-800' :
                    'bg-blue-100 text-blue-800'}`}>
        {children}
    </span>
);
const FallbackButton = ({ children, onClick, disabled = false }: any) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded disabled:opacity-50">
        {children}
    </button>
);
const FallbackSeparator = () => <hr className="my-8" />;

// Try to import UI components, use fallbacks if they don't exist
let Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Separator;
let Accordion, AccordionContent, AccordionItem, AccordionTrigger;

try {
    const cardModule = require('@/components/ui/card');
    Card = cardModule.Card;
    CardHeader = cardModule.CardHeader;
    CardTitle = cardModule.CardTitle;
    CardDescription = cardModule.CardDescription;
    CardContent = cardModule.CardContent;
} catch (e) {
    console.warn('Card components not found, using fallbacks');
    Card = FallbackCard;
    CardHeader = FallbackCardHeader;
    CardTitle = FallbackCardTitle;
    CardDescription = FallbackCardDescription;
    CardContent = FallbackCardContent;
}

try {
    const badgeModule = require('@/components/ui/badge');
    Badge = badgeModule.Badge;
} catch (e) {
    console.warn('Badge component not found, using fallback');
    Badge = FallbackBadge;
}

try {
    const buttonModule = require('@/components/ui/button');
    Button = buttonModule.Button;
} catch (e) {
    console.warn('Button component not found, using fallback');
    Button = FallbackButton;
}

try {
    const separatorModule = require('@/components/ui/separator');
    Separator = separatorModule.Separator;
} catch (e) {
    console.warn('Separator component not found, using fallback');
    Separator = FallbackSeparator;
}

try {
    const accordionModule = require('@/components/ui/accordion');
    Accordion = accordionModule.Accordion;
    AccordionContent = accordionModule.AccordionContent;
    AccordionItem = accordionModule.AccordionItem;
    AccordionTrigger = accordionModule.AccordionTrigger;
} catch (e) {
    console.warn('Accordion components not found, using div elements');
    Accordion = ({ children, ...props }: any) => <div {...props}>{children}</div>;
    AccordionItem = ({ children, ...props }: any) => <div {...props}>{children}</div>;
    AccordionTrigger = ({ children, ...props }: any) => <div className="font-bold mb-2" {...props}>{children}</div>;
    AccordionContent = ({ children, ...props }: any) => <div className="ml-4 mb-4" {...props}>{children}</div>;
}

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
    });

    const [showEnvVars, setShowEnvVars] = useState(false);

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
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="tables">
                                        <AccordionTrigger>
                                            Tables ({info.database.tables?.length || 0})
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <ul className="space-y-1 text-sm">
                                                {info.database.tables?.map((table, i) => (
                                                    <li key={i}>{table}</li>
                                                ))}
                                            </ul>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </div>
                        ) : info.database.status === 'error' ? (
                            <div className="text-destructive">{info.database.error}</div>
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

            <Separator className="my-8" />

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
                                        <Accordion type="single" collapsible className="w-full">
                                            <AccordionItem value="response">
                                                <AccordionTrigger>Response</AccordionTrigger>
                                                <AccordionContent>
                                                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                                                        {JSON.stringify(data.response, null, 2)}
                                                    </pre>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    </div>
                                ) : data.status === 'error' ? (
                                    <div className="text-destructive">{data.error}</div>
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

            <Separator className="my-8" />

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