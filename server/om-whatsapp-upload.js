/**
 * Fast inbound WhatsApp media upload → Filevault /api/images/upload (+ optional event link).
 * Supports: photos, screenshots, voice/audio, video, documents (PDF, Office, etc.).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { FILEVAULT_API, filevaultFetch } = require('./om-api-tools');
const {
  formatReplyForWhatsApp,
  resolveBearerForPhone,
  buildWhatsAppOmRequest,
} = require('./om-whatsapp-actions');
const { buildDeepLink } = require('./om-route-catalog');

const SEND_MEDIA_BACK =
  String(process.env.OM_WHATSAPP_SEND_MEDIA_BACK || 'true').toLowerCase() !== 'false';
const CLEANUP_INBOUND =
  String(process.env.OM_WHATSAPP_CLEANUP_INBOUND || 'true').toLowerCase() !== 'false';

const MAX_WHATSAPP_UPLOAD_BYTES = 50 * 1024 * 1024;
const MAX_PARALLEL_UPLOADS = 6;

function pathsEqual(a, b) {
  if (a === b) return true;
  if (process.platform === 'darwin' || process.platform === 'win32') {
    return a.toLowerCase() === b.toLowerCase();
  }
  return false;
}

function isPathUnderRoot(realPath, root) {
  if (pathsEqual(realPath, root)) return true;
  const prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (process.platform === 'darwin' || process.platform === 'win32') {
    return realPath.toLowerCase().startsWith(prefix.toLowerCase());
  }
  return realPath.startsWith(prefix);
}

function getOpenClawConfigDir() {
  const raw = (
    process.env.OPENCLAW_CONFIG_PATH ||
    process.env.OPENCLAW_CONFIG ||
    ''
  ).trim();
  if (!raw) return path.join(os.homedir(), '.openclaw');
  const resolved = path.resolve(raw);
  if (resolved.endsWith('.json') && fs.existsSync(resolved)) {
    return path.dirname(resolved);
  }
  if (fs.existsSync(resolved)) return resolved;
  return path.dirname(resolved);
}

function getAllowedMediaRoots() {
  const candidates = [
    path.join(os.homedir(), '.openclaw'),
    getOpenClawConfigDir(),
    path.join(__dirname, '..', '.openclaw'),
    path.join(__dirname, '..'),
    path.join(os.tmpdir(), 'openclaw'),
  ];
  const out = [];
  const seen = new Set();
  for (const r of candidates) {
    try {
      if (!fs.existsSync(r)) continue;
      const real = fs.realpathSync(r);
      const key = real.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(real);
    } catch {
      /* skip */
    }
  }
  return out;
}

function assertAllowedMediaPath(filePath) {
  const resolved = path.resolve(String(filePath || '').trim());
  if (!resolved) return null;
  let real;
  try {
    real = fs.realpathSync(resolved);
  } catch {
    return null;
  }
  for (const root of getAllowedMediaRoots()) {
    if (isPathUnderRoot(real, root)) return real;
  }
  return null;
}

function parseMediaUri(ref) {
  const m = String(ref || '').trim().match(/^media:\/\/([^/]+)\/(.+)$/i);
  if (!m) return null;
  return { subdir: m[1], id: m[2] };
}

async function readMediaViaOpenClaw(subdir, id) {
  try {
    const { readMediaBuffer } = await import('openclaw/plugin-sdk/media-store');
    const result = await readMediaBuffer(id, subdir, MAX_WHATSAPP_UPLOAD_BYTES);
    return {
      buffer: result.buffer,
      path: result.path,
      fileName: path.basename(result.path),
    };
  } catch (e) {
    console.warn('[whatsapp-upload] readMediaBuffer failed:', e.message);
    return null;
  }
}

/**
 * Resolve WhatsApp/OpenClaw media reference to a readable local file or buffer.
 */
async function resolveInboundMediaItem(item) {
  if (item?.buffer?.length) {
    return {
      buffer: item.buffer,
      mime: item.type || item.mime,
      fileName: item.name || item.fileName,
    };
  }

  const ref = String(item?.path || '').trim();
  if (!ref) return null;

  if (ref.startsWith('file://')) {
    const local = decodeURIComponent(ref.replace(/^file:\/\//i, ''));
    const safe = assertAllowedMediaPath(local);
    if (!safe || !fs.existsSync(safe)) return null;
    return {
      buffer: fs.readFileSync(safe),
      mime: item.type || item.mime,
      fileName: item.name || item.fileName || path.basename(safe),
      path: safe,
    };
  }

  const uri = parseMediaUri(ref);
  if (uri) {
    const fromSdk = await readMediaViaOpenClaw(uri.subdir, uri.id);
    if (fromSdk) {
      return {
        buffer: fromSdk.buffer,
        mime: item.type || item.mime,
        fileName: item.name || item.fileName || fromSdk.fileName,
        path: fromSdk.path,
      };
    }
    const mediaDir = path.join(getOpenClawConfigDir(), 'media', uri.subdir);
    const direct = path.join(mediaDir, uri.id);
    const safe = assertAllowedMediaPath(direct);
    if (safe && fs.existsSync(safe)) {
      return {
        buffer: fs.readFileSync(safe),
        mime: item.type || item.mime,
        fileName: item.name || item.fileName || path.basename(safe),
        path: safe,
      };
    }
    if (fs.existsSync(mediaDir)) {
      const hit = fs.readdirSync(mediaDir).find((f) => f === uri.id || f.includes(uri.id));
      if (hit) {
        const safeHit = assertAllowedMediaPath(path.join(mediaDir, hit));
        if (safeHit) {
          return {
            buffer: fs.readFileSync(safeHit),
            mime: item.type || item.mime,
            fileName: item.name || item.fileName || hit,
            path: safeHit,
          };
        }
      }
    }
    return null;
  }

  let resolved = ref;
  if (!path.isAbsolute(resolved)) {
    const bases = [
      path.join(getOpenClawConfigDir(), 'media', 'inbound'),
      path.join(getOpenClawConfigDir(), 'media'),
      getOpenClawConfigDir(),
      path.join(__dirname, '..', '.openclaw', 'media', 'inbound'),
    ];
    for (const base of bases) {
      const cand = path.join(base, resolved);
      if (fs.existsSync(cand)) {
        resolved = cand;
        break;
      }
    }
  }

  const safe = assertAllowedMediaPath(resolved);
  if (!safe || !fs.existsSync(safe)) {
    console.warn(
      `[whatsapp-upload] media not readable: ref=${ref.slice(0, 120)} resolved=${resolved} safe=${safe || 'denied'}`
    );
    return null;
  }

  return {
    buffer: fs.readFileSync(safe),
    mime: item.type || item.mime,
    fileName: item.name || item.fileName || path.basename(safe),
    path: safe,
  };
}

function stripWhatsAppEnvelopeText(text) {
  let t = String(text || '').trim();
  if (!t) return '';
  if (/^\[WhatsApp\s+/i.test(t)) {
    const close = t.indexOf('):');
    if (close !== -1) t = t.slice(close + 2).trim();
    else return '';
  }
  if (isMediaPlaceholder(t)) return '';
  return t;
}

function normalizeMime(mime) {
  return String(mime || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
}

function isMediaPlaceholder(text) {
  const t = String(text || '').trim();
  if (!t) return true;
  if (/^<media:/i.test(t)) return true;
  if (
    /^\[(image|photo|screenshot|video|document|audio|voice|sticker|file)\]$/i.test(t)
  ) {
    return true;
  }
  return false;
}

function mediaKindFromPlaceholder(text) {
  const t = String(text || '').trim().toLowerCase();
  if (t.includes('video')) return 'video';
  if (t.includes('audio') || t.includes('voice')) return 'audio';
  if (t.includes('document')) return 'document';
  if (t.includes('sticker') || t.includes('image') || t.includes('photo')) return 'image';
  return null;
}

function classifyMediaKind(mime, fileName) {
  const m = normalizeMime(mime);
  const fn = String(fileName || '').toLowerCase();

  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  if (
    m.startsWith('application/') ||
    m.startsWith('text/') ||
    /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|csv|txt)$/i.test(fn)
  ) {
    return 'document';
  }
  if (m === 'application/octet-stream' || !m) {
    if (/\.(mp4|mov|webm|mkv)$/i.test(fn)) return 'video';
    if (/\.(ogg|opus|mp3|m4a|aac|wav|amr)$/i.test(fn)) return 'audio';
    if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar)$/i.test(fn)) return 'document';
    if (/\.(png|jpe?g|gif|webp|heic|heif)$/i.test(fn)) return 'image';
    return 'file';
  }
  return 'file';
}

function isBlockedMedia(_mime, fileName) {
  const fn = String(fileName || '').toLowerCase();
  return /\.(exe|bat|cmd|com|msi|scr|vbs)$/i.test(fn);
}

function isUploadableMedia(mime, fileName) {
  if (isBlockedMedia(mime, fileName)) return false;
  return true;
}

function kindLabel(kind) {
  const labels = {
    image: 'Photo/screenshot',
    video: 'Video',
    audio: 'Voice note',
    document: 'Document',
    file: 'File',
  };
  return labels[kind] || 'File';
}

const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'audio/ogg': '.ogg',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/aac': '.aac',
  'audio/amr': '.amr',
  'application/pdf': '.pdf',
};

function pickFilename(safePath, mediaFileName, mime) {
  const named = String(mediaFileName || '').trim();
  if (named && !named.includes('..') && !named.includes('/')) return named;
  const base = path.basename(safePath || '');
  if (base && base !== '.' && !base.startsWith('.')) return base;
  const m = normalizeMime(mime);
  const ext = MIME_EXT[m] || (m.startsWith('image/') ? '.jpg' : m.startsWith('video/') ? '.mp4' : m.startsWith('audio/') ? '.ogg' : '.bin');
  return `whatsapp-${Date.now()}${ext}`;
}

async function uploadBytesToFilevault({ auth, buffer, mime, fileName }) {
  if (!buffer?.length) {
    return { ok: false, error: 'Empty file' };
  }
  if (buffer.length > MAX_WHATSAPP_UPLOAD_BYTES) {
    return { ok: false, error: 'File too large (max 50 MB).' };
  }

  const contentType = normalizeMime(mime) || 'application/octet-stream';
  const blob = new Blob([buffer], { type: contentType });
  const form = new FormData();
  form.append('file', blob, fileName);

  const res = await fetch(`${FILEVAULT_API}/api/images/upload`, {
    method: 'POST',
    headers: { Authorization: auth, Accept: 'application/json' },
    body: form,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text.slice(0, 500);
  }

  if (!res.ok) {
    const errMsg =
      typeof data === 'string'
        ? data
        : data?.message || data?.error || JSON.stringify(data).slice(0, 200);
    return { ok: false, status: res.status, error: errMsg || `HTTP ${res.status}` };
  }

  const imageId = data?.id ?? data?.image?.id ?? data?.imageId;
  const downloadUrl = data?.downloadUrl ?? data?.url ?? data?.image?.downloadUrl;
  const fileType = data?.fileType ?? data?.file_type;
  return {
    ok: true,
    imageId,
    downloadUrl,
    fileType,
    deduplicated: Boolean(data?.deduplicated),
  };
}

async function uploadFileToFilevault({ auth, filePath, mime, fileName }) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    return { ok: false, error: 'Not a file' };
  }
  const buffer = fs.readFileSync(filePath);
  return uploadBytesToFilevault({
    auth,
    buffer,
    mime,
    fileName: fileName || path.basename(filePath),
  });
}

async function resolveEventIdFromCaption(req, caption) {
  const t = String(caption || '').trim();
  if (!t) return null;

  let m = t.match(/\bevent\s*[#:]\s*(\d+)\b/i);
  if (m) return m[1];

  m = t.match(/\b(?:to|for)\s+event\s+["']?([^"'\n]+?)["']?(?:\s|$)/i);
  if (!m) {
    m = t.match(/\bevent\s+["']?([^"'\n]+?)["']?(?:\s|$)/i);
  }
  if (!m) return null;

  const name = m[1].trim();
  if (/^\d+$/.test(name)) return name;

  const r = await filevaultFetch(req, 'GET', '/api/memories/events');
  if (!r.ok) return null;
  const events = Array.isArray(r.data) ? r.data : r.data?.events;
  if (!Array.isArray(events)) return null;

  const lower = name.toLowerCase();
  const exact = events.find((e) => String(e?.name || e?.title || '').toLowerCase() === lower);
  if (exact?.id != null) return String(exact.id);
  const partial = events.find((e) =>
    String(e?.name || e?.title || '')
      .toLowerCase()
      .includes(lower)
  );
  return partial?.id != null ? String(partial.id) : null;
}

async function linkImageToMemoriesEvent(req, eventId, imageId, comment) {
  const r = await filevaultFetch(req, 'POST', `/api/memories/events/${eventId}/images`, {
    body: { imageIds: [imageId] },
  });
  if (!r.ok) return r;

  const note = String(comment || '').trim();
  if (note && !isMediaPlaceholder(note)) {
    await filevaultFetch(
      req,
      'POST',
      `/api/memories/events/${eventId}/images/${imageId}/comments`,
      { body: { text: note.slice(0, 500) } }
    );
  }
  return r;
}

async function uploadOneMediaItem({ req, auth, item, placeholderText }) {
  const resolved = await resolveInboundMediaItem(item);
  if (!resolved?.buffer?.length) {
    return {
      ok: false,
      error:
        'Could not read that attachment. Check OpenClaw saved media under your .openclaw/media folder.',
    };
  }

  const mime = resolved.mime || item.type || item.mime || '';
  const hintKind = item.kind || mediaKindFromPlaceholder(placeholderText);
  let fileName = resolved.fileName || item.name || item.fileName;
  const safePath = resolved.path || null;
  const buffer = resolved.buffer;

  if (!fileName) fileName = pickFilename(safePath || 'wa', '', mime);

  const kind =
    hintKind && hintKind !== 'file' ? hintKind : classifyMediaKind(mime, fileName);

  if (!isUploadableMedia(mime, fileName)) {
    return {
      ok: false,
      error: `Cannot upload this file type (${kindLabel(kind)}). Blocked or unknown format.`,
    };
  }

  const result = await uploadBytesToFilevault({ auth, buffer, mime, fileName });
  return { ...result, mediaKind: kind, localPath: safePath || resolved.path || null };
}

function cleanupInboundFile(filePath) {
  if (!CLEANUP_INBOUND || !filePath) return;
  try {
    const safe = assertAllowedMediaPath(filePath);
    if (safe && fs.existsSync(safe)) fs.unlinkSync(safe);
  } catch (e) {
    console.warn('[whatsapp-upload] cleanup skipped:', filePath, e.message);
  }
}

async function sendUploadedMediaOnWhatsApp({ to, uploaded }) {
  if (!SEND_MEDIA_BACK || !to || !uploaded?.length) return;

  const {
    gatewaySendWhatsAppMedia,
    ensureWhatsAppChannelRunning,
    normalizeWhatsAppTarget,
  } = require('./openclaw-gateway-client');
  const target = normalizeWhatsAppTarget(to);
  if (!target) return;

  try {
    await ensureWhatsAppChannelRunning();
  } catch (e) {
    console.warn('[whatsapp-upload] WhatsApp channel not ready for media send:', e.message);
    return;
  }

  for (const u of uploaded) {
    const p = u.localPath;
    if (!p || !fs.existsSync(p)) continue;
    const kind = u.mediaKind || 'file';
    if (kind !== 'image' && kind !== 'video' && kind !== 'document') continue;
    try {
      await gatewaySendWhatsAppMedia({
        to: target,
        mediaPath: p,
        text: u.deduplicated ? 'Already in your OM gallery ✓' : 'Saved to your OM gallery ✓',
      });
    } catch (e) {
      console.warn('[whatsapp-upload] WhatsApp media preview failed:', e.message);
    }
  }
}

/**
 * @returns {Promise<string|null>} WhatsApp-formatted reply, or null to fall through to text assistant.
 */
async function processWhatsAppMediaInbound({ req, from, text, media }) {
  const items = (Array.isArray(media) ? media : []).filter((m) => m?.path || m?.buffer?.length);
  if (items.length === 0) return null;

  const omReq = req?.body?.sessionId ? req : buildWhatsAppOmRequest({ from, text, req });
  const auth = resolveBearerForPhone(from) || omReq?.headers?.authorization;
  if (!auth) {
    return formatReplyForWhatsApp({
      reply:
        'Media received. Link OM: open Studio → WhatsApp in the browser while logged in, then send again. (Or set OM_WHATSAPP_API_TOKEN in server .env for full access.)',
      toolAuthFailed: true,
    });
  }

  const caption = stripWhatsAppEnvelopeText(text);
  const eventId = caption ? await resolveEventIdFromCaption(omReq, caption) : null;

  const batch = items.slice(0, MAX_PARALLEL_UPLOADS);
  const results = await Promise.all(
    batch.map((item) =>
      uploadOneMediaItem({ req: omReq, auth, item, placeholderText: text })
    )
  );

  const uploaded = [];
  const errors = [];

  for (const result of results) {
    if (result.ok) uploaded.push(result);
    else if (result.status === 401) {
      return formatReplyForWhatsApp({
        reply: 'Upload failed — session expired. Open Studio → WhatsApp while logged in, then retry.',
        toolAuthFailed: true,
      });
    } else {
      errors.push(result.error || 'Upload failed');
    }
  }

  let linkedEventName = null;
  if (eventId && uploaded.length) {
    for (const u of uploaded) {
      if (!u.imageId) continue;
      const link = await linkImageToMemoriesEvent(omReq, eventId, u.imageId, caption);
      if (link.ok) linkedEventName = eventId;
      else errors.push(`Could not attach to event ${eventId}: ${link.error || link.status}`);
    }
  }

  const lines = [];

  if (uploaded.length === 1) {
    const u = uploaded[0];
    const label = kindLabel(u.mediaKind || 'file');
    lines.push(
      u.deduplicated
        ? `${label} already in your vault (duplicate skipped).`
        : linkedEventName
          ? `${label} uploaded and linked to event #${linkedEventName}.`
          : `${label} uploaded to your OM library.`
    );
    if (u.imageId) lines.push(`File ID: ${u.imageId}`);
    if (u.fileType) lines.push(`Type: ${u.fileType}`);
    if (u.downloadUrl) lines.push(`View: ${u.downloadUrl}`);
    const gallery = buildDeepLink('/client-images');
    if (gallery) lines.push(`Gallery: ${gallery}`);
  } else if (uploaded.length > 1) {
    const kinds = [...new Set(uploaded.map((u) => u.mediaKind).filter(Boolean))];
    const summary =
      kinds.length === 1 ? kindLabel(kinds[0]) + 's' : 'files';
    lines.push(
      linkedEventName
        ? `Uploaded ${uploaded.length} ${summary} and linked to event #${linkedEventName}.`
        : `Uploaded ${uploaded.length} ${summary} to your OM library.`
    );
    const ids = uploaded.map((u) => u.imageId).filter(Boolean);
    if (ids.length) lines.push(`IDs: ${ids.join(', ')}`);
    const gallery = buildDeepLink('/client-images');
    if (gallery) lines.push(`Gallery: ${gallery}`);
  }

  if (errors.length) lines.push(...errors.slice(0, 3));

  if (!lines.length) {
    return formatReplyForWhatsApp({
      reply:
        'Could not upload. Send a photo, video, voice note, or document — or link Studio → WhatsApp.',
      toolAuthFailed: false,
    });
  }

  if (caption && !linkedEventName && !/\bevent\b/i.test(caption)) {
    lines.push(`Note: ${caption.slice(0, 160)}`);
  } else if (caption && !linkedEventName && /\bevent\b/i.test(caption)) {
    lines.push('Tip: use "for event Summer Party" or "event #12" in the caption to auto-link.');
  }

  await sendUploadedMediaOnWhatsApp({ to, uploaded });

  const cleanupPaths = uploaded.map((u) => u.localPath).filter(Boolean);
  for (const p of [...new Set(cleanupPaths)]) {
    cleanupInboundFile(p);
  }

  return formatReplyForWhatsApp({ reply: lines.join('\n'), matchedRoute: null });
}

module.exports = {
  assertAllowedMediaPath,
  processWhatsAppMediaInbound,
  isMediaPlaceholder,
  stripWhatsAppEnvelopeText,
  resolveInboundMediaItem,
  classifyMediaKind,
  normalizeMime,
  kindLabel,
  uploadBytesToFilevault,
  uploadFileToFilevault,
  linkImageToMemoriesEvent,
  resolveEventIdFromCaption,
};
