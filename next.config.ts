import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.handwrytten.com',
      },
      {
        protocol: 'https',
        hostname: 'd3e924qpzqov0g.cloudfront.net',
      },
    ],
    minimumCacheTTL: 86400, // 24 hours — card catalog rarely changes
  },
};

export default nextConfig;
