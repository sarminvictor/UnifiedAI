/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    logging: {
        fetches: {
            fullUrl: true,
        },
    },
    // Skip environment variables during build since they're added manually in Vercel
    env: {},
    // Disable type checking during build for faster builds
    typescript: {
        ignoreBuildErrors: true,
    },
    // Disable ESLint during build
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Turn off static exports
    output: 'standalone',
    // Disable image optimization during build
    images: {
        unoptimized: true,
        domains: ['lh3.googleusercontent.com'],
    },
    webpack: (config, { dev, isServer }) => {
        // Add optimization for development
        if (dev && !isServer) {
            config.optimization = {
                ...config.optimization,
                splitChunks: {
                    chunks: 'all',
                },
            };
        }
        return config;
    },
    experimental: {
        // Remove appDir as it's now default in Next.js 14
        optimizePackageImports: ['@langchain/openai', '@langchain/anthropic', '@langchain/google-genai'],
        // Mark problem packages for client-side rendering only
        serverComponentsExternalPackages: [
            'resend',
            '@radix-ui/react-accordion',
            '@radix-ui/react-dialog',
            '@radix-ui/react-slot',
            '@radix-ui/react-separator',
            '@geist-ui/core',
            'sonner'
        ],
        serverActions: {
            allowedOrigins: ["localhost:3000", "unified-ai-lac.vercel.app"],
        },
    },
    poweredByHeader: false,

    async rewrites() {
        return [
            {
                source: '/api/webhook',
                destination: '/api/webhook',
            },
        ];
    },

    async headers() {
        return [
            {
                source: '/api/webhook',
                headers: [
                    { key: 'Access-Control-Allow-Origin', value: '*' },
                    { key: 'Access-Control-Allow-Methods', value: 'POST,OPTIONS' },
                    { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Stripe-Signature' },
                ],
            },
        ];
    },

    async redirects() {
        return [
            {
                source: '/payment-success',
                destination: '/subscriptions/payment-success',
                permanent: true,
            },
            {
                source: '/payment-failed',
                destination: '/subscriptions/payment-failed',
                permanent: true,
            }
        ];
    },
}

module.exports = nextConfig; 