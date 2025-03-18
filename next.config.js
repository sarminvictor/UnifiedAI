/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
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
        // Ignore certain errors
        config.ignoreWarnings = [
            { module: /node_modules\/@prisma\/client/ },
            { module: /node_modules\/next/ },
        ];
        return config;
    },
    experimental: {
        optimizePackageImports: ['@langchain/openai', '@langchain/anthropic', '@langchain/google-genai'],
        serverComponentsExternalPackages: ['*'],
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

    typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        ignoreBuildErrors: true,
    },

    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },

    // Add this to ignore build errors
    onDemandEntries: {
        // period (in ms) where the server will keep pages in the buffer
        maxInactiveAge: 25 * 1000,
        // number of pages that should be kept simultaneously without being disposed
        pagesBufferLength: 2,
    },

    images: {
        domains: ['lh3.googleusercontent.com'],
    },
}

module.exports = nextConfig; 