export default ({ env }: { env: any }) => ({
  host: env('HOST', '127.0.0.1'),
  port: env.int('PORT', 1337),
  ...(env('NODE_ENV') === 'production' ? { url: '/cms', proxy: true } : {}),
  app: {
    keys: env.array('APP_KEYS'),
  },
});
