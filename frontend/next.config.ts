import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      // allow backend upload URLs in production
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  serverExternalPackages: ['pg'],
};

export default nextConfig;
