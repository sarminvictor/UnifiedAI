import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { NextRequest } from 'next/server';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

// Function to dynamically adjust authOptions based on the request
function getAdjustedAuthOptions(request: NextRequest) {
    // Clone the authOptions to avoid modifying the original
    const options = { ...authOptions };

    // Get the current host from the request
    const currentHost = request.headers.get('host') || '';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

    // Log current host information
    console.log('NextAuth route called with host:', currentHost);
    console.log('Configured NEXTAUTH_URL:', process.env.NEXTAUTH_URL);

    return options;
}

// Create handlers that adjust options based on the request
export async function GET(request: NextRequest) {
    const adjustedOptions = getAdjustedAuthOptions(request);
    const handler = NextAuth(adjustedOptions);
    return handler(request as any);
}

export async function POST(request: NextRequest) {
    const adjustedOptions = getAdjustedAuthOptions(request);
    const handler = NextAuth(adjustedOptions);
    return handler(request as any);
}

// Re-export authOptions for easier importing in other files
export { authOptions };
