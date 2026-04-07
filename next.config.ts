import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowLocalIP: true,
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
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1337',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '*.stream.prepr.io',
      },
    ],
  },
};

export default nextConfig;
