import { NextRequest, NextResponse } from 'next/server';

// Determine if we're in Vercel's build environment
const isBuildTime = () => {
    return process.env.VERCEL_ENV === 'preview' ||
        process.env.VERCEL_ENV === 'production' ||
        process.env.VERCEL_ENV === 'build';
};

// For build time, provide dummy handlers
export async function POST(request: NextRequest) {
    if (isBuildTime()) {
        console.log('Build-time webhook POST - returning dummy response');
        return NextResponse.json({ message: 'Build-time dummy response' });
    }

    // Dynamically import the implementation to avoid build-time evaluation
    try {
        const { handleWebhook } = await import('./webhook-handler');
        return handleWebhook(request);
    } catch (error) {
        console.error('Failed to load webhook handler:', error);
        return NextResponse.json(
            { error: 'Failed to load webhook implementation' },
            { status: 500 }
        );
    }
}

export async function GET() {
    // Simple method not allowed response
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
