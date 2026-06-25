/**
 * Self-chat helpers — only the linked phone (Message yourself) may send/receive OM traffic.
 */

function normalizePhoneDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

function toE164Loose(raw) {
  const s = String(raw || '').trim().replace(/^whatsapp:/i, '');
  if (s.includes('@')) {
    const digits = s.split('@')[0].replace(/\D/g, '');
    return digits ? `+${digits}` : null;
  }
  const digits = normalizePhoneDigits(s);
  if (digits.length < 10) return null;
  return s.startsWith('+') ? `+${digits}` : `+${digits}`;
}

function phonesMatch(a, b) {
  const da = normalizePhoneDigits(a);
  const db = normalizePhoneDigits(b);
  if (!da || !db) return false;
  if (da === db) return true;
  // last 10 digits (India etc.)
  if (da.length >= 10 && db.length >= 10) {
    return da.slice(-10) === db.slice(-10);
  }
  return false;
}

/** Inbound sender is the linked self-chat number only */
function isSelfChatSender(sender, linkedPhoneE164) {
  if (!linkedPhoneE164) return false;
  const from = toE164Loose(sender);
  const linked = toE164Loose(linkedPhoneE164);
  if (!from || !linked) return false;
  return phonesMatch(from, linked);
}

/** Keep only self-chat + OM/system rows in the message log */
function filterSelfChatMessages(messages, linkedPhoneE164) {
  if (!linkedPhoneE164) return [];
  const list = Array.isArray(messages) ? messages : [];
  return list.filter((m) => {
    const from = m?.from;
    const to = m?.to;
    if (from === 'om' || from === 'system' || to === 'om') return true;
    if (isSelfChatSender(from, linkedPhoneE164)) return true;
    if (isSelfChatSender(to, linkedPhoneE164)) return true;
    return false;
  });
}

module.exports = {
  normalizePhoneDigits,
  toE164Loose,
  phonesMatch,
  isSelfChatSender,
  filterSelfChatMessages,
};
