import { type NextRequest } from 'next/server';

/**
 * Runtime configuration helper for handling different Vercel deployment environments
 */

// List of all known domains where this app could be running
const validHosts = [
    'unified-ai-lac.vercel.app',                              // Primary domain
    'unified-ai-lac-git-main-sarminvictors-projects.vercel.app', // Main branch preview
    'unified-k9219h20m-sarminvictors-projects.vercel.app',    // PR/branch preview
    'localhost:3000',                                          // Local development
];

/**
 * This utility provides functions for determining accurate runtime configuration
 * Especially useful for handling dynamic hostnames in Vercel preview deployments
 */

// Get the current hostname, respecting headers when available
export function getCurrentHost(req?: NextRequest): string {
    // This will run on the client during CSR, so we use window.location
    if (typeof window !== 'undefined') {
        return window.location.hostname;
    }

    // If we have a request object, use its host header
    if (req) {
        const host = req.headers.get('host') || '';
        const forwardedHost = req.headers.get('x-forwarded-host') || '';
        return forwardedHost || host || '';
    }

    // In server components without request context, use environment variables
    if (process.env.VERCEL_URL) {
        return process.env.VERCEL_URL;
    }

    // Fallback to NEXTAUTH_URL if available
    if (process.env.NEXTAUTH_URL) {
        try {
            const url = new URL(process.env.NEXTAUTH_URL);
            return url.hostname;
        } catch (e) {
            console.error('Failed to parse NEXTAUTH_URL:', e);
        }
    }

    // Default fallback for local development
    return process.env.NODE_ENV === 'development' ? 'localhost:3000' : '';
}

// Determines the base URL to use for redirects and callbacks
export function getBaseUrl(req?: NextRequest): string {
    // In production, we use HTTPS
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

    // If on the client, we can get the URL from the window
    if (typeof window !== 'undefined') {
        return `${window.location.protocol}//${window.location.host}`;
    }

    // Get the hostname
    const host = getCurrentHost(req);
    if (!host) {
        return '';
    }

    // Use appropriate protocol based on environment
    const isLocalhost = host.includes('localhost');
    return `${isLocalhost ? 'http' : 'https'}://${host}`;
}

// Function to get Google OAuth callback URL
export function getGoogleCallbackUrl(req?: NextRequest): string {
    return `${getBaseUrl(req)}/api/auth/callback/google`;
}

// Get all possible Google OAuth callback URLs for configuration
export function getAllCallbackUrls(): string[] {
    return validHosts.map(host => {
        const protocol = host.includes('localhost') ? 'http' : 'https';
        return `${protocol}://${host}/api/auth/callback/google`;
    });
}

// Function to get all relevant auth callback URLs to try (for debug purposes)
export function getPossibleCallbackUrls(req?: NextRequest): string[] {
    const baseUrl = getBaseUrl(req);
    const urls = [
        `${baseUrl}/api/auth/callback/google`,
    ];

    // Add Vercel URL if available and different
    if (process.env.VERCEL_URL) {
        const vercelUrl = `https://${process.env.VERCEL_URL}/api/auth/callback/google`;
        if (!urls.includes(vercelUrl)) {
            urls.push(vercelUrl);
        }
    }

    // Add NEXTAUTH_URL if available and different
    if (process.env.NEXTAUTH_URL) {
        const nextAuthUrl = `${process.env.NEXTAUTH_URL}/api/auth/callback/google`;
        if (!urls.includes(nextAuthUrl)) {
            urls.push(nextAuthUrl);
        }
    }

    return urls;
} 