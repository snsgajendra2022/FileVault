/**
 * Persist OM WhatsApp studio flags across dev-server restarts (in-memory state resets on npm start).
 */
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', '.portal-data', 'whatsapp-studio-state.json');

function loadWhatsAppStudioState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return {};
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveWhatsAppStudioState(patch) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const prev = loadWhatsAppStudioState();
    const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
    fs.writeFileSync(STATE_FILE, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    return next;
  } catch (e) {
    console.warn('[whatsapp] could not persist studio state:', e.message);
    return patch;
  }
}

module.exports = { loadWhatsAppStudioState, saveWhatsAppStudioState, STATE_FILE };
