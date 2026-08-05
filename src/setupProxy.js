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

  // Portal settings (sidebar menus) — portal-dev-server on 9093
  const portalDev =
    (process.env.REACT_APP_PORTAL_DEV_URL || `http://127.0.0.1:${process.env.PORTAL_DEV_PORT || process.env.OPENCLAW_DEV_PORT || 9093}`).replace(
      /\/$/,
      ''
    );
  const portalProxy = createProxyMiddleware({
    target: portalDev,
    changeOrigin: true,
    logLevel: 'warn',
  });
  app.use('/api/portal', portalProxy);
};
