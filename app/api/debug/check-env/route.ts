import { NextResponse } from 'next/server';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

export async function GET() {
    // Only return the existence of values, not the values themselves
    return NextResponse.json({
        variables: {
            NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
            NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
            GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
            DATABASE_URL: !!process.env.DATABASE_URL,
        },
        baseUrl: process.env.NEXTAUTH_URL || 'Not set'
    });
} 