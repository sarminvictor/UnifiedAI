import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * This route returns detailed information about the current request and environment
 * Useful for debugging OAuth redirect issues, CORS problems, etc.
 */
export async function GET(request: NextRequest) {
    try {
        // Get all headers
        const headersList = headers();
        const allHeaders: Record<string, string> = {};

        headersList.forEach((value, key) => {
            allHeaders[key] = value;
        });

        // Get URL information
        const url = new URL(request.url);

        // Collect environment variables (non-sensitive ones only)
        const safeEnvVars = {
            NODE_ENV: process.env.NODE_ENV,
            VERCEL_URL: process.env.VERCEL_URL,
            VERCEL_ENV: process.env.VERCEL_ENV,
            NEXTAUTH_URL: process.env.NEXTAUTH_URL,
            // Don't include secrets, only presence indicators
            HAS_GOOGLE_CREDENTIALS: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
            HAS_NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
            HAS_DATABASE_URL: !!process.env.DATABASE_URL,
        };

        // Return debug information
        return NextResponse.json({
            request: {
                url: request.url,
                method: request.method,
                headers: allHeaders,
                urlDetails: {
                    protocol: url.protocol,
                    host: url.host,
                    hostname: url.hostname,
                    port: url.port,
                    pathname: url.pathname,
                    search: url.search,
                    searchParams: Object.fromEntries(url.searchParams.entries()),
                    hash: url.hash,
                    origin: url.origin,
                },
                referrer: request.headers.get('referer') || null,
                userAgent: request.headers.get('user-agent') || null,
            },
            server: {
                timestamp: new Date().toISOString(),
                environment: safeEnvVars,
            }
        });
    } catch (error) {
        console.error('Error in debug request handler:', error);
        return NextResponse.json({
            error: 'Failed to process debug request',
            message: String(error),
        }, { status: 500 });
    }
}

// Also support POST for form submission debugging
export async function POST(request: NextRequest) {
    try {
        // Get request body if possible
        let body = null;
        let contentType = request.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            try {
                body = await request.json();
            } catch (e) {
                body = { error: 'Failed to parse JSON body', message: String(e) };
            }
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
            try {
                const formData = await request.formData();
                body = Object.fromEntries(formData.entries());
            } catch (e) {
                body = { error: 'Failed to parse form data', message: String(e) };
            }
        } else {
            try {
                body = { text: await request.text() };
            } catch (e) {
                body = { error: 'Failed to read request body', message: String(e) };
            }
        }

        // Get the GET response first
        const getResponse = await GET(request);
        const getResponseData = await getResponse.json();

        // Add the body and return
        return NextResponse.json({
            ...getResponseData,
            request: {
                ...getResponseData.request,
                body,
            }
        });
    } catch (error) {
        console.error('Error in debug POST handler:', error);
        return NextResponse.json({
            error: 'Failed to process debug POST request',
            message: String(error),
        }, { status: 500 });
    }
} 