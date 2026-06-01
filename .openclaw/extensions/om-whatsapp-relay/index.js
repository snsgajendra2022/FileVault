import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import fs from 'node:fs';

const DEFAULT_RELAY_URL = 'http://127.0.0.1:9093/api/whatsapp/relay-inbound';

function isWhatsAppSurface(ctx, event) {
  const provider = String(ctx?.Provider || ctx?.Surface || event?.originatingChannel || '').toLowerCase();
  return provider === 'whatsapp';
}

function resolveSender(ctx) {
  return (
    String(ctx?.From || ctx?.SenderId || ctx?.ConversationId || ctx?.OriginatingTo || '').trim() ||
    null
  );
}

function collectMedia(ctx) {
  const out = [];
  const paths = ctx?.MediaPaths?.length ? ctx.MediaPaths : ctx?.MediaPath ? [ctx.MediaPath] : [];
  const types = ctx?.MediaTypes?.length ? ctx.MediaTypes : ctx?.MediaType ? [ctx.MediaType] : [];
  const names = [];

  for (let i = 0; i < paths.length; i += 1) {
    const p = String(paths[i] || '').trim();
    if (!p) continue;
    out.push({
      path: p,
      type: types[i] || types[0] || undefined,
      name: names[i] || undefined,
    });
  }
  return out;
}

async function relayInbound({ relayUrl, from, text, media, sessionKey, logger }) {
  const res = await fetch(relayUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
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

  const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
  if (!reply) {
    logger.warn('om-whatsapp-relay: empty reply from dev server');
    return null;
  }
  return reply;
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
      const text = String(ctx.Body || ctx.RawBody || '').trim();
      const media = collectMedia(ctx);

      if (!text && media.length === 0) return;

      for (const item of media) {
        if (item.path && !fs.existsSync(item.path)) {
          api.logger.warn(`om-whatsapp-relay: media missing on disk: ${item.path}`);
        }
      }

      let reply;
      try {
        reply = await relayInbound({
          relayUrl,
          from,
          text,
          media,
          sessionKey: event.sessionKey,
          logger: api.logger,
        });
      } catch (err) {
        api.logger.warn(`om-whatsapp-relay: fetch failed: ${String(err?.message || err)}`);
        return;
      }

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
