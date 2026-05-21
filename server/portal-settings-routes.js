/**
 * Portal settings REST API (dev / reference implementation).
 * Persists to .portal-data/config.json — matches src/api/services/portalSettingsService.ts
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '.portal-data');
const CONFIG_FILE = path.join(DATA_DIR, 'portal-config.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readConfig(defaults) {
  ensureDataDir();
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        ...defaults,
        ...parsed,
        settings: { ...defaults.settings, ...parsed.settings },
        aiToolSettings: { ...defaults.aiToolSettings, ...parsed.aiToolSettings },
        roleMenuPermissions: parsed.roleMenuPermissions || defaults.roleMenuPermissions,
      };
    }
  } catch (e) {
    console.warn('[portal-api] read failed', e.message);
  }
  return defaults;
}

function writeConfig(config) {
  ensureDataDir();
  const next = { ...config, updatedAt: new Date().toISOString() };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

function buildDefaults() {
  // Minimal defaults; SPA merges with nav-built permissions on first load if empty
  return {
    settings: {
      portalName: 'Our Memories Portal',
      language: 'en',
      timezone: 'Asia/Kolkata',
      compactMode: false,
      emailNotifications: true,
      browserNotifications: false,
      requireDeleteConfirmation: true,
      requirePublicShareConfirmation: true,
      themeMode: 'system',
      sidebarCollapsedByDefault: false,
      aiAssistantEnabled: true,
      aiPageContextEnabled: true,
      aiChatHistoryEnabled: true,
      aiUserWiseHistoryEnabled: false,
      aiVoiceEnabled: false,
      aiImageEnabled: true,
      aiUploadDebugEnabled: false,
      aiNetworkDebugEnabled: false,
      aiUiErrorDebugEnabled: false,
      aiSafeActionsEnabled: true,
      aiDangerousConfirmation: true,
      aiShowUsedModel: false,
    },
    roleMenuPermissions: null,
    aiToolSettings: {
      enabled: true,
      pageContextEnabled: true,
      chatHistoryEnabled: true,
      userWiseHistoryEnabled: false,
      voiceEnabled: false,
      imageEnabled: true,
      uploadDebugEnabled: false,
      networkDebugEnabled: false,
      uiErrorDebugEnabled: false,
      actionsEnabled: true,
      safeClicksEnabled: true,
      dangerousActionsRequireConfirmation: true,
      showUsedModel: false,
      fallbackModelsEnabled: false,
      maxTokens: 4096,
      modelTimeoutMs: 30000,
      primaryModel: 'gpt-4o-mini',
      fallbackModels: 'gpt-3.5-turbo',
    },
    menuFlags: { regular: true, studio: true, users: true, admin: true },
    navigationOverrides: [],
    updatedAt: null,
  };
}

function mountPortalSettingsRoutes(app) {
  app.get('/api/portal/config', (_req, res) => {
    const config = readConfig(buildDefaults());
    res.json({ ...config, source: 'api' });
  });

  app.put('/api/portal/config', (req, res) => {
    const current = readConfig(buildDefaults());
    const body = req.body || {};
    const merged = {
      ...current,
      ...body,
      settings: body.settings ? { ...current.settings, ...body.settings } : current.settings,
      aiToolSettings: body.aiToolSettings
        ? { ...current.aiToolSettings, ...body.aiToolSettings }
        : current.aiToolSettings,
      roleMenuPermissions: body.roleMenuPermissions || current.roleMenuPermissions,
      menuFlags: body.menuFlags ? { ...current.menuFlags, ...body.menuFlags } : current.menuFlags,
      navigationOverrides: body.navigationOverrides ?? current.navigationOverrides,
    };
    const saved = writeConfig(merged);
    res.json({ ...saved, source: 'api' });
  });

  app.post('/api/portal/config/reset', (_req, res) => {
    const defaults = buildDefaults();
    const saved = writeConfig(defaults);
    res.json({ ...saved, source: 'api' });
  });

  app.get('/api/portal/permissions', (_req, res) => {
    const config = readConfig(buildDefaults());
    res.json({ roleMenuPermissions: config.roleMenuPermissions });
  });

  app.put('/api/portal/permissions', (req, res) => {
    const current = readConfig(buildDefaults());
    current.roleMenuPermissions = req.body?.roleMenuPermissions || current.roleMenuPermissions;
    const saved = writeConfig(current);
    res.json({ roleMenuPermissions: saved.roleMenuPermissions, ok: true });
  });

  app.get('/api/portal/settings', (_req, res) => {
    const config = readConfig(buildDefaults());
    res.json(config.settings);
  });

  app.put('/api/portal/settings', (req, res) => {
    const current = readConfig(buildDefaults());
    current.settings = { ...current.settings, ...(req.body || {}) };
    const saved = writeConfig(current);
    res.json(saved.settings);
  });

  app.get('/api/portal/ai', (_req, res) => {
    const config = readConfig(buildDefaults());
    res.json(config.aiToolSettings);
  });

  app.put('/api/portal/ai', (req, res) => {
    const current = readConfig(buildDefaults());
    current.aiToolSettings = { ...current.aiToolSettings, ...(req.body || {}) };
    const saved = writeConfig(current);
    res.json(saved.aiToolSettings);
  });

  console.log('[portal-api] routes mounted at /api/portal/*');
}

module.exports = { mountPortalSettingsRoutes, CONFIG_FILE };
