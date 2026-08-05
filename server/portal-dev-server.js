/**
 * Portal settings only (port OPENCLAW_DEV_PORT / PORTAL_DEV_PORT, default 9093).
 * OpenClaw / WhatsApp helpers were removed from this project.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const { mountPortalSettingsRoutes } = require('./portal-settings-routes');

const PORT = Number(process.env.PORTAL_DEV_PORT || process.env.OPENCLAW_DEV_PORT || 9093);
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

mountPortalSettingsRoutes(app);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'portal-dev-server' });
});

app.listen(PORT, () => {
  console.log(`[portal-api] listening on http://127.0.0.1:${PORT}`);
});
