export default () => ({
  'propeller-product-picker': {
    enabled: true,
    resolve: './src/plugins/propeller-product-picker',
  },
  // Uploads may be served from the shop's own origin (/cms/uploads): media, PDF and HTML only.
  // HTML and SVG are served in a script-less sandbox (src/middlewares/upload-headers.ts);
  // script files are refused, since a same-origin .js could be loaded by an XSS.
  upload: {
    config: {
      security: {
        allowedTypes: ['image/*', 'video/*', 'application/pdf', 'text/html'],
        deniedTypes: ['text/javascript', 'application/javascript', 'application/x-msdownload'],
      },
    },
  },
});
