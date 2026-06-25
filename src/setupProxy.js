const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Dev proxy: OM WhatsApp dev server (default port 9093).
 * WhatsApp UI calls same-origin /api/whatsapp/* → proxied to openclaw-dev-server.
 */
module.exports = function setupProxy(app) {
  const omDev = (
    process.env.REACT_APP_OPENCLAW_DEV_URL ||
    process.env.REACT_APP_WHATSAPP_API_URL ||
    `http://127.0.0.1:${process.env.OPENCLAW_DEV_PORT || 9093}`
  ).replace(/\/$/, '');

  const omProxy = createProxyMiddleware({
    target: omDev,
    changeOrigin: true,
    logLevel: 'warn',
  });

  app.use('/api/whatsapp', omProxy);
  app.use('/api/portal', omProxy);
};
