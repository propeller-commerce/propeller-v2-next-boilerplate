import type { UID } from '@strapi/strapi';

// Storefront path per previewable content type; others have no page of their own.
const PREVIEW_PATHS: Partial<Record<UID.ContentType, (slug: string) => string>> = {
  'api::page.page': (slug) => (slug === 'home' ? '/' : `/${slug}`),
  'api::article.article': (slug) => `/blog/${slug}`,
};

export default ({ env }: { env: any }) => {
  const clientUrl = env('CLIENT_URL', 'http://localhost:3000');
  const previewSecret = env('PREVIEW_SECRET');

  return {
    auth: {
      secret: env('ADMIN_JWT_SECRET'),
    },
    apiToken: {
      salt: env('API_TOKEN_SALT'),
    },
    transfer: {
      token: {
        salt: env('TRANSFER_TOKEN_SALT'),
      },
    },
    secrets: {
      encryptionKey: env('ENCRYPTION_KEY'),
    },
    flags: {
      nps: env.bool('FLAG_NPS', true),
      promoteEE: env.bool('FLAG_PROMOTE_EE', true),
    },
    // Side-by-side preview via the storefront's /api/preview (draft mode for status=draft).
    preview: {
      enabled: !!previewSecret,
      config: {
        allowedOrigins: [clientUrl],
        async handler(uid: UID.ContentType, { documentId, locale, status }: { documentId: string; locale?: string; status?: string }) {
          const toPath = PREVIEW_PATHS[uid];
          if (!toPath) return null;
          const doc = await strapi.documents(uid as any).findOne({ documentId, locale, status: status as any, fields: ['slug'] as any });
          const slug = (doc as { slug?: string } | null)?.slug;
          if (!slug) return null;
          const params = new URLSearchParams({
            secret: previewSecret,
            slug: toPath(slug),
            status: status || 'draft',
            ...(locale && { locale }),
          });
          return `${clientUrl}/api/preview?${params}`;
        },
      },
    },
  };
};
