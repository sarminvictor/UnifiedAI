import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Configure rate limiting
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '10 s'), // 20 requests per 10 seconds
});

// Dynamic route configuration
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Error handling helper
export class APIError extends Error {
    constructor(
        public statusCode: number,
        message: string,
        public data?: any
    ) {
        super(message);
        this.name = 'APIError';
    }
}

// Rate limiting middleware
export async function rateLimit(identifier: string) {
    const { success, limit, reset, remaining } = await ratelimit.limit(identifier);

    if (!success) {
        throw new APIError(429, 'Too many requests', {
            limit,
            reset,
            remaining,
        });
    }
}

// Error response helper
export function errorResponse(error: any) {
    console.error('API Error:', error);

    if (error instanceof APIError) {
        return NextResponse.json(
            { error: error.message, data: error.data },
            { status: error.statusCode }
        );
    }

    return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
    );
}

// Success response helper
export function successResponse(data: any, status = 200) {
    return NextResponse.json(data, { status });
}

// Get user ID from session
export async function getUserId() {
    const headersList = headers();
    const authHeader = headersList.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        throw new APIError(401, 'Unauthorized');
    }

    const token = authHeader.split(' ')[1];
    // Add your token verification logic here
    // This is just a placeholder
    return token;
} 