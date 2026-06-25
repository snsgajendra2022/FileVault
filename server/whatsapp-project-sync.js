/**
 * Auto-read project data when WhatsApp connects.
 * Identity = linked phone number (tenant). No separate login username/password.
 */

const { executeTool } = require('./om-api-tools');
const {
  resolveBearerForTenant,
  saveTenantRecord,
  getTenantRecord,
  resolveTenantIdFromPhone,
  registerPhoneAsTenant,
  tenantIdFromPhone,
} = require('./whatsapp-tenant');

function isUsableApiBearer(bearer) {
  const b = String(bearer || '').trim();
  if (!b) return false;
  if (/^Bearer wa-local-/i.test(b)) return false;
  return true;
}

async function ensureTenantApiBearer(tenantId, phoneE164) {
  const bearer = resolveBearerForTenant(tenantId, phoneE164);
  return isUsableApiBearer(bearer) ? bearer : null;
}

function buildOmReq(bearer) {
  return bearer ? { headers: { authorization: bearer } } : null;
}

function countItems(data, keys = []) {
  if (Array.isArray(data)) return data.length;
  for (const k of keys) {
    if (Array.isArray(data?.[k])) return data[k].length;
  }
  return 0;
}

function pickNames(data, keys, limit = 5) {
  let arr = Array.isArray(data) ? data : null;
  if (!arr) {
    for (const k of keys) {
      if (Array.isArray(data?.[k])) {
        arr = data[k];
        break;
      }
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, limit)
    .map((e) => e?.name || e?.title || e?.firstName || e?.username || e?.id)
    .filter(Boolean);
}

async function fetchProjectSnapshot(tenantId, phoneE164) {
  const bearer = await ensureTenantApiBearer(tenantId, phoneE164);
  const req = buildOmReq(bearer);
  if (!req) {
    return {
      ok: false,
      error: 'no_api_token',
      message:
        'WhatsApp number is linked. For studio API data, set OM_WHATSAPP_API_TOKEN in server .env (one studio token), or embed this plugin in your app with the user JWT.',
    };
  }

  const [eventsR, albumsR, imagesR, contactsR, profileR] = await Promise.all([
    executeTool(req, 'list_memories_events', {}),
    executeTool(req, 'list_albums', {}),
    executeTool(req, 'list_user_images', {}),
    executeTool(req, 'list_contacts', { limit: 20 }),
    executeTool(req, 'api_get', { path: '/api/user/profile' }),
  ]);

  const events = eventsR.ok ? eventsR.data : null;
  const albums = albumsR.ok ? albumsR.data : null;
  const images = imagesR.ok ? imagesR.data : null;
  const contacts = contactsR.ok ? contactsR.data : null;
  const profile = profileR.ok ? profileR.data : null;

  const snapshot = {
    syncedAt: new Date().toISOString(),
    tenantId: String(tenantId),
    phoneE164: phoneE164 || null,
    counts: {
      events: countItems(events, ['events']),
      albums: countItems(albums, ['albums']),
      images: countItems(images, ['images', 'content']),
      contacts: countItems(contacts, ['contacts']),
    },
    names: {
      events: pickNames(events, ['events']),
      albums: pickNames(albums, ['albums']),
    },
    profile: profile
      ? {
          username: profile.username || profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
        }
      : null,
    errors: [
      !eventsR.ok ? `events:${eventsR.status || eventsR.error}` : null,
      !albumsR.ok ? `albums:${albumsR.status || albumsR.error}` : null,
      !imagesR.ok ? `images:${imagesR.status || imagesR.error}` : null,
      !contactsR.ok ? `contacts:${contactsR.status || contactsR.error}` : null,
    ].filter(Boolean),
  };

  saveTenantRecord(tenantId, { projectSnapshot: snapshot, linkedPhoneE164: phoneE164 });
  return { ok: true, snapshot };
}

function formatSnapshotForWhatsApp(snapshot) {
  if (!snapshot?.counts) return null;
  const { counts, names, profile, phoneE164 } = snapshot;
  const who =
    profile?.firstName || profile?.username
      ? `Hi ${profile.firstName || profile.username}! `
      : phoneE164
        ? `Hi! Your number ${phoneE164} is connected. `
        : '';
  const lines = [`${who}I read your project:`];
  lines.push(`• ${counts.events} event(s)${names?.events?.length ? ': ' + names.events.join(', ') : ''}`);
  lines.push(`• ${counts.images} photo(s)`);
  lines.push(`• ${counts.albums} album(s)${names?.albums?.length ? ': ' + names.albums.join(', ') : ''}`);
  lines.push(`• ${counts.contacts} contact(s)`);
  lines.push('');
  lines.push('Message me here anytime — ask about events, uploads, albums, or new leads.');
  return lines.join('\n');
}

function getProjectContextForTenant(tenantId) {
  const rec = getTenantRecord(tenantId);
  const s = rec.projectSnapshot;
  if (!s?.counts) return '';
  const parts = [
    `\n[Project snapshot @ ${s.syncedAt} | phone ${s.phoneE164 || tenantId}]`,
    `Events: ${s.counts.events}${s.names?.events?.length ? ' (' + s.names.events.join(', ') + ')' : ''}`,
    `Photos: ${s.counts.images}`,
    `Albums: ${s.counts.albums}`,
    `Contacts: ${s.counts.contacts}`,
    'Use tools to refresh or answer questions about this data.',
  ];
  return parts.join('\n');
}

async function syncProjectForPhone(phoneE164) {
  registerPhoneAsTenant(phoneE164);
  const tenantId = tenantIdFromPhone(phoneE164);
  return fetchProjectSnapshot(tenantId, phoneE164);
}

module.exports = {
  fetchProjectSnapshot,
  formatSnapshotForWhatsApp,
  getProjectContextForTenant,
  syncProjectForPhone,
  ensureTenantApiBearer,
  registerPhoneAsTenant,
  tenantIdFromPhone,
};
