import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wanama.powcdn.com',
      },
    ],
  },
};

export default nextConfig;
