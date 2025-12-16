import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.staging.helice.cloud',
      },
      {
        protocol: 'https',
        hostname: 'playground2.dev.wp-propel.com',
      },
      {
        protocol: 'https',
        hostname: 'staging.media.helice.cloud',
      },
    ],
  },
};

export default nextConfig;
