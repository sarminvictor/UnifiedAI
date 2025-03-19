import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth.config';
import { getToken } from 'next-auth/jwt';
import { getBaseUrl, getPossibleCallbackUrls } from '@/lib/runtime-config';
import type { OAuthConfig } from 'next-auth/providers/oauth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Get JWT token if available
        const token = await getToken({ req });

        // Get environment information
        const baseUrl = getBaseUrl();
        const callbackUrls = getPossibleCallbackUrls();

        // Get host information
        const host = req.headers.get('host') || '';
        const forwardedHost = req.headers.get('x-forwarded-host') || '';
        const referer = req.headers.get('referer') || '';

        // Create a copy of providers, removing secrets
        const providersInfo = authOptions.providers.map(provider => {
            const baseInfo = {
                id: provider.id,
                name: provider.name,
                type: provider.type,
            };

            // Only add authorization info if it's an OAuth provider and has Google ID
            if (provider.id === 'google' && provider.type === 'oauth') {
                const oauthProvider = provider as OAuthConfig<any>;
                return {
                    ...baseInfo,
                    authorization: typeof oauthProvider.authorization === 'object'
                        ? { params: Object.keys(oauthProvider.authorization.params || {}) }
                        : 'string-url',
                };
            }

            return baseInfo;
        });

        // Handle token expiration date formatting
        let formattedToken = null;
        if (token) {
            const expNumber = token.exp as number | undefined;
            const expDate = expNumber ? new Date(expNumber * 1000).toISOString() : undefined;

            formattedToken = {
                ...token,
                exp: expDate,
            };
        }

        // Return auth configuration
        return NextResponse.json({
            status: 'success',
            token: formattedToken,
            auth: {
                baseUrl,
                callbackUrls,
                providers: providersInfo,
                sessionStrategy: authOptions.session?.strategy || 'default',
                debug: !!authOptions.debug,
            },
            environment: {
                vercelUrl: process.env.VERCEL_URL,
                nextAuthUrl: process.env.NEXTAUTH_URL,
                nodeEnv: process.env.NODE_ENV,
                hasGoogleCredentials: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
                hasDatabaseUrl: !!process.env.DATABASE_URL,
            },
            request: {
                host,
                forwardedHost,
                referer,
                url: req.url,
                method: req.method,
            }
        });
    } catch (error) {
        console.error('Error in auth check:', error);
        return NextResponse.json(
            { error: 'Failed to check auth configuration', details: String(error) },
            { status: 500 }
        );
    }
} 