/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config: { optimization: any; }, { dev, isServer }: any) => {
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
    optimizePackageImports: ['@langchain/openai', '@langchain/anthropic', '@langchain/google-genai']
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
