import { headers } from 'next/headers';

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
export function getCurrentHost(): string {
    // This will run on the client during CSR, so we use window.location
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        return hostname;
    }

    // Server-side, we don't have access to headers here
    // This will be enhanced when called from a route handler
    return '';
}

// Determines the base URL to use for redirects and callbacks
export function getBaseUrl(): string {
    // In production, we use HTTPS
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

    // First try to use the configured NEXTAUTH_URL
    if (process.env.NEXTAUTH_URL) {
        return process.env.NEXTAUTH_URL;
    }

    // If on the client, we can get the URL from the window
    if (typeof window !== 'undefined') {
        return `${window.location.protocol}//${window.location.host}`;
    }

    // If the VERCEL_URL is set (in Vercel deployments), use that
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    // For local development
    return process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : '';
}

// Function to get Google OAuth callback URL
export function getGoogleCallbackUrl(): string {
    return `${getBaseUrl()}/api/auth/callback/google`;
}

// Get all possible Google OAuth callback URLs for configuration
export function getAllCallbackUrls(): string[] {
    return validHosts.map(host => {
        const protocol = host.includes('localhost') ? 'http' : 'https';
        return `${protocol}://${host}/api/auth/callback/google`;
    });
}

// Function to get all relevant auth callback URLs to try (for debug purposes)
export function getPossibleCallbackUrls(): string[] {
    const baseUrl = getBaseUrl();
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