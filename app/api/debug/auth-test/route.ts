import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from '@/lib/prismaClient';
import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const startTime = Date.now();

    try {
        // Get current session if exists
        const session = await getServerSession(authOptions);
        const url = new URL(request.url);

        // For Next.js 14, we need to pass cookies() instead of the raw request
        const token = await getToken({
            req: {
                cookies: Object.fromEntries(
                    cookies().getAll().map(c => [c.name, c.value])
                )
            } as any
        });

        // Test PrismaAdapter
        const adapter = PrismaAdapter(prisma);

        // Gather adapter methods
        const adapterMethods = Object.keys(adapter);

        // Test methods that don't require input
        const adapterTests = {
            getUserCount: await prisma.user.count(),
            // We don't actually call adapter methods that would modify data
        };

        // Create a diagnostics object
        const diagnostics = {
            timestamp: new Date().toISOString(),
            duration: Date.now() - startTime,
            session: session ? {
                // Redact potentially sensitive information
                exists: true,
                user: session.user ? {
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.name,
                    hasImage: Boolean(session.user.image),
                } : null,
                expires: session.expires,
            } : null,
            token: token ? {
                exists: true,
                sub: token.sub,
                exp: token.exp,
                iat: token.iat,
                jti: token.jti,
            } : null,
            adapter: {
                available: Boolean(adapter),
                methods: adapterMethods,
            },
            adapterTests,
            environmentVars: {
                hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
                hasNextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
                hasGoogleClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
                hasGoogleClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
            },
            request: {
                headers: {
                    // Include only relevant headers
                    cookie: request.headers.get('cookie') ? 'Present' : 'Missing',
                    authorization: request.headers.get('authorization') ? 'Present' : 'Missing',
                },
                url: url.toString(),
            }
        };

        // Return the diagnostic information
        return NextResponse.json(diagnostics);
    } catch (error: any) {
        // Return error information
        return NextResponse.json({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            timestamp: new Date().toISOString(),
            duration: Date.now() - startTime,
        }, { status: 500 });
    }
} 