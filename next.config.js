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
    return config;
  },
  experimental: {
    // Remove appDir as it's now default in Next.js 14
    optimizePackageImports: ['@langchain/openai', '@langchain/anthropic', '@langchain/google-genai']
  },
  poweredByHeader: false,
}

module.exports = nextConfig;
