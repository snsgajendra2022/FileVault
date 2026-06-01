import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_RELAY_URL = 'http://127.0.0.1:9093/api/whatsapp/relay-inbound';

function isWhatsAppSurface(ctx, event) {
  const provider = String(ctx?.Provider || ctx?.Surface || event?.originatingChannel || '').toLowerCase();
  return provider === 'whatsapp';
}

function resolveSender(ctx) {
  const from = String(ctx?.From || '')
    .trim()
    .replace(/^whatsapp:/i, '');
  const senderId = String(ctx?.SenderId || '').trim();
  // OriginatingTo is the reply destination — not the inbound sender (using it caused wrong-number replies).
  return from || senderId || null;
}

function resolveReplyTarget(ctx, event) {
  const to = String(event?.originatingTo || ctx?.To || '').trim();
  if (to) return to.replace(/^whatsapp:/i, '');
  return resolveSender(ctx);
}

function mediaKindFromBody(body) {
  const t = String(body || '').trim().toLowerCase();
  if (t.includes('video')) return 'video';
  if (t.includes('audio')) return 'audio';
  if (t.includes('document')) return 'document';
  if (t.includes('image') || t.includes('sticker')) return 'image';
  return undefined;
}

function collectMedia(ctx) {
  const out = [];
  const paths = ctx?.MediaPaths?.length ? ctx.MediaPaths : ctx?.MediaPath ? [ctx.MediaPath] : [];
  const urls = ctx?.MediaUrls?.length ? ctx.MediaUrls : ctx?.MediaUrl ? [ctx.MediaUrl] : [];
  const types = ctx?.MediaTypes?.length ? ctx.MediaTypes : ctx?.MediaType ? [ctx.MediaType] : [];
  const bodyKind = mediaKindFromBody(ctx?.Body || ctx?.RawBody);
  const count = Math.max(paths.length, urls.length, types.length ? 1 : 0);

  for (let i = 0; i < count; i += 1) {
    const p = String(paths[i] || urls[i] || '').trim();
    if (!p) continue;
    const type = types[i] || types[0] || undefined;
    const base = p.includes('/') ? path.basename(p) : p.replace(/^media:\/\/[^/]+\//i, '');
    out.push({
      path: p,
      type,
      name: base && base !== '.' ? base : undefined,
      kind: bodyKind,
    });
  }
  return out;
}

async function relayInbound({ relayUrl, from, replyTo, text, media, sessionKey, logger }) {
  const res = await fetch(relayUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      replyTo: replyTo || from,
      text: text || '',
      sessionKey,
      mediaPath: media[0]?.path,
      mediaType: media[0]?.type,
      mediaFileName: media[0]?.name,
      mediaPaths: media.length > 1 ? media : undefined,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.warn(`om-whatsapp-relay: ${res.status} ${body.slice(0, 200)}`);
    return null;
  }

  let data;
  try {
    data = await res.json();
  } catch {
    logger.warn('om-whatsapp-relay: invalid JSON from relay');
    return null;
  }

  if (data?.suppressReply) {
    return data;
  }

  const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
  if (!reply) {
    logger.warn('om-whatsapp-relay: empty reply from dev server');
    return null;
  }
  return { ...data, reply };
}

export default definePluginEntry({
  id: 'om-whatsapp-relay',
  name: 'OM WhatsApp Relay',
  description: 'WhatsApp replies via Filevault openclaw-dev-server (text + image uploads)',
  register(api) {
    const relayUrl =
      typeof api.pluginConfig?.relayUrl === 'string' && api.pluginConfig.relayUrl.trim()
        ? api.pluginConfig.relayUrl.trim()
        : DEFAULT_RELAY_URL;

    api.on('reply_dispatch', async (event, hookCtx) => {
      const ctx = event?.ctx || {};
      if (!isWhatsAppSurface(ctx, event)) return;

      const from = resolveSender(ctx);
      const replyTo = resolveReplyTarget(ctx, event);
      const rawText = String(ctx.Body || ctx.RawBody || '').trim();
      const media = collectMedia(ctx);

      if (!rawText && media.length === 0) return;

      let result;
      try {
        result = await relayInbound({
          relayUrl,
          from: from || replyTo,
          replyTo,
          text: rawText,
          media,
          sessionKey: event.sessionKey,
          logger: api.logger,
        });
      } catch (err) {
        api.logger.warn(`om-whatsapp-relay: fetch failed: ${String(err?.message || err)}`);
        return;
      }

      if (!result) return;

      if (result.suppressReply) {
        hookCtx.recordProcessed('completed', { reason: 'om_inbound_disabled' });
        api.logger.info(
          `om-whatsapp-relay: inbound suppressed (media=${media.length}, om switch off)`
        );
        return {
          handled: true,
          queuedFinal: false,
          counts: hookCtx.dispatcher.getQueuedCounts(),
        };
      }

      const reply = result.reply;
      if (!reply) return;

      const queuedFinal = hookCtx.dispatcher.sendFinalReply({ text: reply });
      hookCtx.recordProcessed('completed', { reason: 'om_whatsapp_relay' });
      api.logger.info(
        `om-whatsapp-relay: handled whatsapp inbound (${reply.length} chars, media=${media.length})`
      );

      return {
        handled: true,
        queuedFinal,
        counts: hookCtx.dispatcher.getQueuedCounts(),
      };
    });
  },
});
