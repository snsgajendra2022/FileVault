const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Dev proxy: FaceSync FastAPI (default http://127.0.0.1:8000).
 * Set REACT_APP_FACESYNC_API_URL in .env to override the target.
 * When base URL is empty in the app, requests use same-origin paths below.
 */
module.exports = function setupProxy(app) {
  const target =
    (process.env.REACT_APP_FACESYNC_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    logLevel: 'warn',
  });

  app.use(['/api/people', '/api/photos', '/api/person', '/api/suggestions', '/api/album', '/api/ops', '/api/presets', '/api/pipeline', '/api/search'], proxy);
  app.use(['/upload-images', '/upload-images/async', '/jobs'], proxy);

  // OM assistant dev server (WhatsApp UI + optional when not using REACT_APP_OPENCLAW_DEV_URL for chat)
  const omDev =
    (process.env.REACT_APP_OPENCLAW_DEV_URL || `http://127.0.0.1:${process.env.OPENCLAW_DEV_PORT || 9093}`).replace(
      /\/$/,
      ''
    );
  const omProxy = createProxyMiddleware({
    target: omDev,
    changeOrigin: true,
    logLevel: 'warn',
  });
  // WhatsApp real QR: proxy to openclaw-dev-server (9093) when page uses same-origin /api/whatsapp
  app.use('/api/whatsapp', omProxy);
  app.use('/api/portal', omProxy);
};
