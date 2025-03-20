import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { authOptions } from '@/lib/auth.config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Define test endpoints
const TEST_ENDPOINTS: Record<string, { method: string; path: string; headers?: Record<string, string>; body?: any }> = {
    auth: {
        method: 'GET',
        path: '/api/auth/session',
    },
    webhook: {
        method: 'GET', // Just check if it exists, don't actually call POST
        path: '/api/webhook',
    },
    reset_password: {
        method: 'GET', // Just check if it exists, don't actually send email
        path: '/api/auth/reset-password',
    },
    // Add more endpoints to test as needed
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint || !TEST_ENDPOINTS[endpoint]) {
        return NextResponse.json(
            { error: 'Invalid endpoint specified' },
            { status: 400 }
        );
    }

    const config = TEST_ENDPOINTS[endpoint];
    const absoluteUrl = new URL(config.path, process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000').toString();

    try {
        // For real testing, uncomment and modify as needed:
        /*
        const response = await fetch(absoluteUrl, {
          method: config.method,
          headers: {
            'Content-Type': 'application/json',
            ...config.headers,
          },
          ...(config.body ? { body: JSON.stringify(config.body) } : {}),
        });
        
        const data = await response.json();
        */

        // For now, just return mock data to avoid actual API calls
        const responseMock: {
            status: string;
            endpoint: string;
            url: string;
            exists: boolean;
            details: {
                method: string;
                authProtected: boolean;
                environment: string;
                providers?: string[];
                adapter?: string;
            }
        } = {
            status: 'ok',
            endpoint,
            url: absoluteUrl,
            exists: true,
            details: {
                method: config.method,
                authProtected: endpoint === 'auth',
                environment: process.env.NODE_ENV || 'unknown',
            }
        };

        // Additional details for specific endpoints
        if (endpoint === 'auth') {
            responseMock.details.providers = authOptions?.providers?.map((p: any) => p.id) || [];
            responseMock.details.adapter = authOptions?.adapter ? 'Configured' : 'Not configured';
        }

        return NextResponse.json(responseMock);
    } catch (error: any) {
        return NextResponse.json(
            {
                status: 'error',
                endpoint,
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
} 