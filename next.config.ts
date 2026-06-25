import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  // The propeller surface lives in a sibling repo and is consumed here via a
  // `file:` link (`D:/laragon/www/propeller-ui/propeller-v2-react-ui`). Tell
  // Next.js to transpile it (the prebuilt dist already ships ES modules, but
  // Turbopack's RSC analyzer needs the source pulled into the same build
  // graph) and widen the file-tracing root so symlinks outside this repo
  // aren't pruned at build time.
  transpilePackages: ['@propeller-commerce/propeller-v2-react-ui'],
  outputFileTracingRoot: resolve(__dirname, '..', '..'),
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
        hostname: 'nextjs-boilerplate.dev.wp-propel.com',
        pathname: '/cms/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '*.stream.prepr.io',
      },
      {
        protocol: 'https',
        hostname: 'images.ctfassets.net',
      },
    ],
  },
};

export default nextConfig;
