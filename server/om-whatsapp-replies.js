/**
 * Fast OM replies for WhatsApp (hi → intro, task hints). Used by dev server + documented for gateway persona.
 */

const OM_INTRO =
  "Hey! I'm OM — your Our Memories assistant.\n\n" +
  'Give me a task, for example:\n' +
  '• list my events\n' +
  '• show my albums\n' +
  '• how many photos do I have\n' +
  '• help with uploads\n\n' +
  'What would you like to do?';

const OM_WELCOME_OUTBOUND =
  "Hey! I'm OM — your Our Memories assistant.\n\n" +
  "You're connected. Send hi anytime, or ask me to manage your studio from here.";

const GREETING_RE = /^(hi+|hello+|hey+|hola|namaste|howdy|yo|ok+|okay|hii+)\b/i;

function isWhatsAppGreeting(text) {
  const t = String(text || '').trim();
  if (!t) return false;
  if (GREETING_RE.test(t)) return true;
  if (t.length <= 12 && /^(hi|hey|ok|hello)\b/i.test(t)) return true;
  return false;
}

function buildOmWhatsAppReply(userText) {
  const t = String(userText || '').trim();
  if (!t) return OM_INTRO;
  if (isWhatsAppGreeting(t)) return OM_INTRO;
  return null;
}

module.exports = {
  OM_INTRO,
  OM_WELCOME_OUTBOUND,
  isWhatsAppGreeting,
  buildOmWhatsAppReply,
};
