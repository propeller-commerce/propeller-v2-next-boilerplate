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
  // Next's built-in gzip fully buffers small responses before flushing, which
  // swallows the streamed `loading.tsx` skeleton on RSC navigations (the ~10KB
  // gzipped payload fits one compression buffer → delivered all at once, no
  // skeleton-first flush). Turn Next compression off and let the proxy compress
  // — its gzip streams large responses. Deploy behind a compressing proxy/CDN.
  // ponytail: if the proxy still buffers the small RSC, set `gzip off` for
  // `text/x-component` (or `proxy_buffering off`) on the upstream.
  compress: false,
  // Streaming SSR for the catalog shells relies on the server flushing the
  // `loading.tsx` skeleton *before* the awaited GraphQL data. A reverse proxy
  // with response buffering on (nginx default) swallows that first flush and
  // delivers the whole payload at once — so the skeleton never paints and a
  // client-side navigation just waits on the old page. `X-Accel-Buffering: no`
  // tells nginx (and buffering-aware proxies) to stream this response through.
  // ponytail: header covers nginx; if the proxy isn't nginx, set
  // `proxy_buffering off` on the upstream instead.
  async headers() {
    return [
      {
        source: '/:route(cluster|product|category|search)/:path*',
        headers: [{ key: 'X-Accel-Buffering', value: 'no' }],
      },
    ];
  },
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
