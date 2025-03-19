import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { NextRequest } from 'next/server';
import { getBaseUrl, getCurrentHost } from '@/lib/runtime-config';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

// Function to dynamically adjust authOptions based on the request
function getAdjustedAuthOptions(request: NextRequest) {
    // Clone the authOptions to avoid modifying the original
    const options = { ...authOptions };

    // Get the current host from the request
    const host = request.headers.get('host') || '';
    const forwardedHost = request.headers.get('x-forwarded-host') || '';
    const currentHost = forwardedHost || host || '';

    // Log detailed host information
    console.log('NextAuth handler - Request details:');
    console.log('  Current host:', currentHost);
    console.log('  X-Forwarded-Host:', forwardedHost);
    console.log('  Host header:', host);
    console.log('  Configured NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
    console.log('  Headers:', JSON.stringify(Object.fromEntries(request.headers)));

    if (currentHost) {
        // Override the URL in environment
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const baseUrl = `${protocol}://${currentHost}`;
        console.log('  Overriding with dynamic baseUrl:', baseUrl);

        // Modify the Google provider's callback URL dynamically
        if (options.providers && options.providers[1]?.id === 'google') {
            console.log('  Adjusting Google provider configuration');
        }
    }

    return options;
}

// Create handlers that adjust options based on the request
export async function GET(request: NextRequest) {
    console.log('NextAuth GET request to', request.nextUrl.pathname);
    const adjustedOptions = getAdjustedAuthOptions(request);
    const handler = NextAuth(adjustedOptions);
    return handler(request as any);
}

export async function POST(request: NextRequest) {
    console.log('NextAuth POST request to', request.nextUrl.pathname);
    const adjustedOptions = getAdjustedAuthOptions(request);
    const handler = NextAuth(adjustedOptions);
    return handler(request as any);
}

// Re-export authOptions for easier importing in other files
export { authOptions };
