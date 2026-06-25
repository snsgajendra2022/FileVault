/**
 * Per-user (tenant) isolation for WhatsApp message logs and API tokens.
 * Each logged-in user sees only their own messages — never another account's data.
 */

const { loadWhatsAppStudioState, saveWhatsAppStudioState } = require('./whatsapp-studio-state');

function normalizeBearer(token) {
  const t = String(token || '').trim();
  if (!t) return null;
  return t.toLowerCase().startsWith('bearer ') ? t : `Bearer ${t}`;
}

function decodeJwtPayload(token) {
  try {
    const part = String(token || '').split('.')[1];
    if (!part) return null;
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Resolve tenant id from Authorization Bearer JWT or headers */
function resolveTenantIdFromReq(req) {
  const headerTenant = String(req?.headers?.['x-tenant-id'] || req?.headers?.['x-user-id'] || '').trim();
  if (headerTenant) return headerTenant;

  const auth = String(req?.headers?.authorization || '').trim();
  if (!auth.toLowerCase().startsWith('bearer ')) return 'guest';
  const payload = decodeJwtPayload(auth.slice(7));
  if (!payload) return 'guest';
  const id =
    payload.userId ??
    payload.user_id ??
    payload.sub ??
    payload.id ??
    payload.username;
  return id != null ? String(id) : 'guest';
}

function loadTenants() {
  const prev = loadWhatsAppStudioState();
  return prev.tenants && typeof prev.tenants === 'object' ? prev.tenants : {};
}

function getTenantRecord(tenantId) {
  const tenants = loadTenants();
  return tenants[String(tenantId)] || { messages: [] };
}

function saveTenantRecord(tenantId, patch) {
  const id = String(tenantId || 'guest');
  const tenants = loadTenants();
  const prev = tenants[id] || { messages: [] };
  tenants[id] = { ...prev, ...patch, updatedAt: new Date().toISOString() };
  saveWhatsAppStudioState({ tenants });
  return tenants[id];
}

function pushTenantMessage(tenantId, entry) {
  const rec = getTenantRecord(tenantId);
  const messages = Array.isArray(rec.messages) ? [...rec.messages] : [];
  messages.unshift(entry);
  while (messages.length > 200) messages.pop();
  saveTenantRecord(tenantId, { messages });
  return messages;
}

function getTenantMessages(tenantId) {
  const rec = getTenantRecord(tenantId);
  return Array.isArray(rec.messages) ? rec.messages : [];
}

function linkTenantAuth(tenantId, phoneE164, bearer) {
  const id = String(tenantId || 'guest');
  const normalized = normalizeBearer(bearer);
  if (!normalized) return;

  const tenants = loadTenants();
  const prev = tenants[id] || { messages: [] };
  tenants[id] = {
    ...prev,
    bearer: normalized,
    linkedPhoneE164: phoneE164 || prev.linkedPhoneE164 || null,
    updatedAt: new Date().toISOString(),
  };

  const phoneToTenant = { ...(loadWhatsAppStudioState().phoneToTenant || {}) };
  if (phoneE164) {
    const digits = String(phoneE164).replace(/\D/g, '');
    if (digits) phoneToTenant[digits] = id;
  }

  saveWhatsAppStudioState({ tenants, phoneToTenant });
}

function resolveTenantIdFromPhone(phoneE164) {
  const digits = String(phoneE164 || '').replace(/\D/g, '');
  if (!digits) return 'guest';
  const map = loadWhatsAppStudioState().phoneToTenant || {};
  return map[digits] || map[digits.slice(-10)] || 'guest';
}

function resolveBearerForTenant(tenantId, phoneE164) {
  const env = normalizeBearer(process.env.OM_WHATSAPP_API_TOKEN || process.env.FILEVAULT_WHATSAPP_BEARER);
  if (env) return env;
  const rec = getTenantRecord(tenantId);
  if (rec.bearer && !/^Bearer wa-local-/i.test(rec.bearer)) return rec.bearer;
  const prev = loadWhatsAppStudioState();
  const key = String(phoneE164 || '').trim();
  if (key && prev.filevaultBearerByPhone?.[key]) return prev.filevaultBearerByPhone[key];
  if (prev.filevaultBearer) return prev.filevaultBearer;
  return null;
}

/** Linked WhatsApp number is the tenant id — no separate login username. */
function registerPhoneAsTenant(phoneE164) {
  const digits = String(phoneE164 || '').replace(/\D/g, '');
  if (!digits) return null;
  const tenantId = digits;

  const phoneToTenant = { ...(loadWhatsAppStudioState().phoneToTenant || {}) };
  phoneToTenant[digits] = tenantId;
  if (digits.length >= 10) phoneToTenant[digits.slice(-10)] = tenantId;
  saveWhatsAppStudioState({ phoneToTenant });

  const envToken = normalizeBearer(
    process.env.OM_WHATSAPP_API_TOKEN || process.env.FILEVAULT_WHATSAPP_BEARER
  );
  if (envToken) {
    linkTenantAuth(tenantId, phoneE164, envToken);
  } else {
    saveTenantRecord(tenantId, { linkedPhoneE164: phoneE164 });
  }
  return tenantId;
}

function tenantIdFromPhone(phoneE164) {
  const digits = String(phoneE164 || '').replace(/\D/g, '');
  return digits || 'guest';
}

module.exports = {
  resolveTenantIdFromReq,
  getTenantRecord,
  saveTenantRecord,
  pushTenantMessage,
  getTenantMessages,
  linkTenantAuth,
  resolveTenantIdFromPhone,
  resolveBearerForTenant,
  registerPhoneAsTenant,
  tenantIdFromPhone,
};
