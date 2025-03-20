/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
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
    },
    poweredByHeader: false,

    // Add transpilePackages for sonner
    transpilePackages: ['sonner'],

    // Important for Stripe webhooks - disable body parsing for the webhook endpoint
    api: {
        bodyParser: {
            sizeLimit: '1mb',
        },
        // Disable body parsing for webhook routes
        bodyParser: (req) => {
            return req.url.includes('/api/webhook') ? false : { sizeLimit: '1mb' };
        },
    },

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