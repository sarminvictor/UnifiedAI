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
        // in dev mode, make the build faster
        if (dev) {
            config.watchOptions = {
                ...config.watchOptions,
                poll: 1000,
                aggregateTimeout: 300,
            };
        }
        return config;
    },
    experimental: {
        // Remove appDir as it's now default in Next.js 14
        optimizePackageImports: [
            'langchain/agents',
            'langchain/chains',
            'langchain/chat_models',
            'langchain/docstore',
            'langchain/document_loaders',
            'langchain/embeddings',
            'langchain/experimental',
            'langchain/llms',
            'langchain/memory',
            'langchain/output_parsers',
            'langchain/prompts',
            'langchain/retrievers',
            'langchain/schema',
            'langchain/tools',
            'langchain/vectorstores'
        ]
    },
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
    typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        // !! WARN !!
        ignoreBuildErrors: true,
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
                    { key: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
                    { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, stripe-signature' },
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

    env: {
        // This controls whether to use dummy API implementations during build
        VERCEL_ENV: process.env.VERCEL_ENV || 'development',
        NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || 'development',
    }
}

module.exports = nextConfig; 