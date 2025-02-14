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
  // Simplify experimental features
  experimental: {
    // Remove optimizeCss as it requires additional setup
    optimizePackageImports: ['@langchain/openai', '@langchain/anthropic', '@langchain/google-genai']
  },
  poweredByHeader: false,
}

module.exports = nextConfig;
