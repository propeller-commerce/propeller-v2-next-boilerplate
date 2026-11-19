import type { Core } from '@strapi/strapi';

// Served as is; anything else (HTML under any extension, SVG, XML, text) gets the sandbox.
const PASSIVE = /^(image\/(?!svg)[\w.+-]+|video\/[\w.+-]+|audio\/[\w.+-]+|application\/pdf)$/i;

/**
 * Uploaded files: no type sniffing, and every type that could carry script only in a sandbox
 * (no script, an opaque origin without the shop's cookies). Decided on the content type sent,
 * not the file name. Editors may upload HTML; it displays but can't act as the shop.
 */
export default (_config: unknown, _ctx: { strapi: Core.Strapi }) => {
  return async (
    ctx: { path: string; type: string; set: (key: string, value: string) => void },
    next: () => Promise<void>,
  ) => {
    await next();
    if (!ctx.path.startsWith('/uploads/')) return;
    ctx.set('X-Content-Type-Options', 'nosniff');
    if (!PASSIVE.test(ctx.type || '')) {
      ctx.set('Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; font-src 'self' data:");
    }
  };
};
