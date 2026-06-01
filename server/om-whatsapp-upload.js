/**
 * Upload inbound WhatsApp media (images) to Filevault /api/images/upload.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { FILEVAULT_API } = require('./om-api-tools');
const { formatReplyForWhatsApp, resolveBearerForPhone } = require('./om-whatsapp-actions');

const MAX_WHATSAPP_UPLOAD_BYTES = 50 * 1024 * 1024;

function getAllowedMediaRoots() {
  const roots = [
    path.join(os.homedir(), '.openclaw'),
    path.join(__dirname, '..', '.openclaw'),
    path.join(os.tmpdir(), 'openclaw'),
  ];
  const out = [];
  for (const r of roots) {
    try {
      if (fs.existsSync(r)) out.push(fs.realpathSync(r));
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
    if (real === root || real.startsWith(root + path.sep)) return real;
  }
  return null;
}

function isMediaPlaceholder(text) {
  const t = String(text || '').trim();
  if (!t) return true;
  if (/^<media:/i.test(t)) return true;
  if (/^\[(image|photo|video|document|audio|sticker)\]$/i.test(t)) return true;
  return false;
}

function isUploadableImageMime(mime) {
  const t = String(mime || '').toLowerCase();
  if (!t) return true;
  if (t.startsWith('image/')) return true;
  if (t === 'application/octet-stream') return true;
  return false;
}

function pickFilename(safePath, mediaFileName, mime) {
  const named = String(mediaFileName || '').trim();
  if (named && !named.includes('..') && !named.includes('/')) return named;
  const ext =
    mime === 'image/png'
      ? '.png'
      : mime === 'image/webp'
        ? '.webp'
        : mime === 'image/gif'
          ? '.gif'
          : '.jpg';
  return `whatsapp-${Date.now()}${ext}`;
}

async function uploadFileToFilevault({ auth, filePath, mime, fileName }) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size > MAX_WHATSAPP_UPLOAD_BYTES) {
    return { ok: false, error: 'File too large or not readable (max 50 MB).' };
  }

  const buffer = fs.readFileSync(filePath);
  const blob = new Blob([buffer], { type: mime || 'image/jpeg' });
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
  return { ok: true, imageId, downloadUrl, deduplicated: Boolean(data?.deduplicated) };
}

/**
 * @returns {Promise<string|null>} WhatsApp-formatted reply, or null to fall through to text assistant.
 */
async function processWhatsAppMediaInbound({ req, from, text, media }) {
  const items = (Array.isArray(media) ? media : []).filter((m) => m?.path);
  if (items.length === 0) return null;

  const auth = resolveBearerForPhone(from) || req?.headers?.authorization;
  if (!auth) {
    return formatReplyForWhatsApp({
      reply: 'I got your photo. Link your OM account: open Studio → WhatsApp in the browser while logged in, then send the image again.',
      toolAuthFailed: true,
    });
  }

  const uploaded = [];
  const errors = [];

  for (const item of items) {
    const mime = item.type || item.mime || 'image/jpeg';
    if (!isUploadableImageMime(mime)) {
      errors.push('Only images can be uploaded from WhatsApp right now (not video/documents).');
      continue;
    }

    const safe = assertAllowedMediaPath(item.path);
    if (!safe) {
      errors.push('Could not read that attachment.');
      continue;
    }

    const fileName = pickFilename(safe, item.name || item.fileName, mime);
    const result = await uploadFileToFilevault({
      auth,
      filePath: safe,
      mime,
      fileName,
    });

    if (result.ok) {
      uploaded.push(result);
    } else if (result.status === 401) {
      return formatReplyForWhatsApp({
        reply: 'Upload failed — session expired. Open Studio → WhatsApp in the browser while logged in, then try again.',
        toolAuthFailed: true,
      });
    } else {
      errors.push(result.error || 'Upload failed');
    }
  }

  const caption = isMediaPlaceholder(text) ? '' : String(text || '').trim();
  const lines = [];

  if (uploaded.length === 1) {
    const u = uploaded[0];
    lines.push(
      u.deduplicated
        ? 'That image is already in your vault (duplicate skipped).'
        : 'Uploaded to your OM image library.'
    );
    if (u.imageId) lines.push(`Image ID: ${u.imageId}`);
    if (u.downloadUrl) lines.push(`View: ${u.downloadUrl}`);
  } else if (uploaded.length > 1) {
    lines.push(`Uploaded ${uploaded.length} images to your OM library.`);
    const ids = uploaded.map((u) => u.imageId).filter(Boolean);
    if (ids.length) lines.push(`IDs: ${ids.join(', ')}`);
  }

  if (errors.length) lines.push(...errors);

  if (!lines.length) {
    return formatReplyForWhatsApp({
      reply: 'I could not upload that file. Send a photo (JPEG/PNG) or open Studio → WhatsApp to link your account.',
      toolAuthFailed: false,
    });
  }

  if (caption) lines.push(`Caption noted: ${caption.slice(0, 200)}`);

  return formatReplyForWhatsApp({ reply: lines.join('\n') });
}

module.exports = {
  assertAllowedMediaPath,
  processWhatsAppMediaInbound,
  isMediaPlaceholder,
};
