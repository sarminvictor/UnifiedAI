import { NextResponse } from 'next/server';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from '@/lib/prismaClient';
import { authOptions } from '@/lib/auth.config';
import { getCsrfToken, getSession } from 'next-auth/react';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    const logs = [];
    const errors = [];
    let adapterStatus = 'unknown';
    let authOptionsStatus = 'unknown';

    try {
        logs.push('Starting NextAuth diagnostic tests');

        // Test adapter creation
        try {
            logs.push('Testing PrismaAdapter creation');
            const adapter = PrismaAdapter(prisma);

            if (adapter) {
                adapterStatus = 'success';
                logs.push('✓ PrismaAdapter was created successfully');

                // Check adapter methods
                const methods = Object.keys(adapter).filter(k => typeof adapter[k as keyof typeof adapter] === 'function');
                logs.push(`✓ Adapter has ${methods.length} methods: ${methods.join(', ')}`);
            } else {
                adapterStatus = 'error';
                errors.push('Adapter creation returned undefined/null');
            }
        } catch (error: any) {
            adapterStatus = 'error';
            errors.push(`Adapter creation error: ${error.message}`);
            logs.push(`✗ PrismaAdapter creation failed: ${error.message}`);
        }

        // Test auth options
        try {
            logs.push('Examining authOptions configuration');
            if (!authOptions) {
                authOptionsStatus = 'error';
                errors.push('authOptions is undefined');
                logs.push('✗ authOptions is undefined');
            } else {
                authOptionsStatus = 'success';
                const { adapter, providers, callbacks, session, secret } = authOptions;

                logs.push(`✓ authOptions is defined with: ${Object.keys(authOptions).join(', ')}`);

                if (!adapter) logs.push('✗ Missing adapter in authOptions');
                if (!providers || providers.length === 0) logs.push('✗ No providers configured in authOptions');
                if (!callbacks) logs.push('✗ No callbacks configured in authOptions');
                if (!session) logs.push('✗ No session config in authOptions');
                if (!secret && !process.env.NEXTAUTH_SECRET) logs.push('✗ No secret configured in authOptions or NEXTAUTH_SECRET env var');
            }
        } catch (error: any) {
            authOptionsStatus = 'error';
            errors.push(`Auth options check error: ${error.message}`);
            logs.push(`✗ Error checking authOptions: ${error.message}`);
        }

        // Check for environment variables
        logs.push('Checking NextAuth environment variables');
        const requiredEnvVars = ['NEXTAUTH_URL', 'NEXTAUTH_SECRET'];
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                logs.push(`✗ Missing environment variable: ${envVar}`);
                errors.push(`Missing ${envVar} environment variable`);
            } else {
                logs.push(`✓ ${envVar} is set`);
            }
        }

        // Check provider environment variables
        if (authOptions?.providers) {
            const googleProvider = authOptions.providers.find((p: any) => p.id === 'google');
            const credentialsProvider = authOptions.providers.find((p: any) => p.id === 'credentials');

            if (googleProvider) {
                logs.push('Checking Google provider configuration');
                if (!process.env.GOOGLE_CLIENT_ID) {
                    errors.push('Missing GOOGLE_CLIENT_ID environment variable');
                    logs.push('✗ Missing GOOGLE_CLIENT_ID environment variable');
                }
                if (!process.env.GOOGLE_CLIENT_SECRET) {
                    errors.push('Missing GOOGLE_CLIENT_SECRET environment variable');
                    logs.push('✗ Missing GOOGLE_CLIENT_SECRET environment variable');
                }
            }

            if (credentialsProvider) {
                logs.push('✓ Credentials provider is configured');
            }
        }

        // Recommendations
        let recommendations = [];

        if (errors.length > 0) {
            recommendations = [
                'Fix the reported errors in the auth configuration',
                'Ensure all required environment variables are set',
                'Check if NextAuth tables exist and are properly configured',
                'Verify that the adapter is properly connected to Prisma'
            ];
        } else {
            recommendations = [
                'Your NextAuth configuration appears to be correct',
                'If you still have issues, check for runtime errors in Vercel logs',
                'Ensure the database connection string is correct',
                'Check for any edge cases in your auth flow'
            ];
        }

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            diagnostics: {
                adapter: { status: adapterStatus },
                authOptions: { status: authOptionsStatus },
                environmentComplete: errors.length === 0,
            },
            logs,
            errors,
            recommendations
        });
    } catch (error: any) {
        return NextResponse.json({
            timestamp: new Date().toISOString(),
            error: error.message,
            logs,
            errors: [...errors, error.message]
        }, { status: 500 });
    }
} 