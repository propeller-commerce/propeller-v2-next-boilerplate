import type { Core } from '@strapi/strapi';

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  // The shop uses no Strapi end users: keep public sign-up off whatever the admin settings say.
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const store = strapi.store({ type: 'plugin', name: 'users-permissions', key: 'advanced' });
    const advanced = ((await store.get()) as Record<string, unknown> | null) ?? {};
    if (advanced.allow_register !== false) await store.set({ value: { ...advanced, allow_register: false } });
  },
};
