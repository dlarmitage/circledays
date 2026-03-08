import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.handwrytten.com',
      },
    ],
    minimumCacheTTL: 86400, // 24 hours — card catalog rarely changes
  },
};

export default nextConfig;
