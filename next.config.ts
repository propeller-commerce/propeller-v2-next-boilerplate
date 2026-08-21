import type { NextConfig } from "next";
import { resolve } from "node:path";

// Stamped into the client bundle so `lib/clientStorage.ts` can tell "written by
// this build" from "written by an older one" and drop stale caches on its own
//.
//
// The CI commit sha is preferred because it changes on EVERY deploy. The
// package version is the local-dev fallback; it is bumped per release here, but
// a shop scaffolded from this boilerplate may leave its version at 1.0.0
// forever, and a stamp that never changes purges nothing.
const APP_VERSION: string =
  process.env.NEXT_PUBLIC_BUILD_ID ||
  process.env.CI_COMMIT_SHORT_SHA ||
  require('./package.json').version;

// Five settings exist twice — once server-side, once as a NEXT_PUBLIC_ twin the
// browser can read — and the example file used to just ask you to keep them in
// sync by hand. Every one of those was a silent misconfiguration waiting to
// happen (server and client disagreeing, with no error). Derive the twin from
// the server variable instead, so it cannot drift. An explicitly-set
// NEXT_PUBLIC_ value is still honoured when the server one is absent, so shops
// configured the old way keep working.
const TWINS: Record<string, string | undefined> = {
  NEXT_PUBLIC_DEFAULT_LANGUAGE: process.env.BOILERPLATE_DEFAULT_LANGUAGE,
  NEXT_PUBLIC_BOILERPLATE_MACHINE_SOURCE: process.env.BOILERPLATE_MACHINE_SOURCE,
  NEXT_PUBLIC_BOILERPLATE_MACHINE_LANGUAGE: process.env.BOILERPLATE_MACHINE_LANGUAGE,
  NEXT_PUBLIC_CMS_PROVIDER: process.env.CMS_PROVIDER,
  NEXT_PUBLIC_PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
  NEXT_PUBLIC_ON_ACCOUNT_PAYMENTS: process.env.ON_ACCOUNT_PAYMENTS,
  NEXT_PUBLIC_USE_GA4: process.env.USE_GA4,
  NEXT_PUBLIC_GA4_KEY: process.env.GA4_KEY,
  NEXT_PUBLIC_GTM_KEY: process.env.GTM_KEY,
};

// `env` entries are inlined verbatim, so an `undefined` would land in the
// bundle as the literal string "undefined" — only carry the ones we resolved.
const derivedEnv: Record<string, string> = { NEXT_PUBLIC_APP_VERSION: APP_VERSION };
for (const [publicName, serverValue] of Object.entries(TWINS)) {
  const value = serverValue ?? process.env[publicName];
  if (value !== undefined) derivedEnv[publicName] = value;
}

const nextConfig: NextConfig = {
  env: derivedEnv,
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
