/**
 * One-click OM WhatsApp setup: phone → allowFrom → listener → welcome message.
 */

const { OM_WELCOME_OUTBOUND } = require('./om-whatsapp-replies');
const {
  fetchProjectSnapshot,
  formatSnapshotForWhatsApp,
} = require('./whatsapp-project-sync');
const { resolveTenantIdFromPhone } = require('./whatsapp-tenant');

async function bootstrapOmWhatsApp(state, deps) {
  const {
    syncFromGateway,
    resolveWhatsAppLinkedPhoneE164,
    rememberLinkedPhone,
    ensureWhatsAppChannelRunning,
    sendOmMessageToPhone,
    sendOmWelcomeToPhone,
    isGatewayReachable,
    isGatewayConfigured,
    hasWhatsAppSessionCreds,
  } = deps;

  if (state.bootstrapInFlight) {
    return { ok: false, busy: true };
  }
  state.bootstrapInFlight = true;
  try {
    if (!isGatewayConfigured()) {
      return { ok: false, error: 'OpenClaw gateway not configured' };
    }
    if (!(await isGatewayReachable())) {
      return {
        ok: false,
        error:
          'Gateway not reachable. Run: node server/run-openclaw-gateway.js (or npm start)',
      };
    }

    const wa = await syncFromGateway();
    const phone = await resolveWhatsAppLinkedPhoneE164();
    if (phone) rememberLinkedPhone(phone);

    if (!wa?.linked && !state.linked) {
      const hint = hasWhatsAppSessionCreds()
        ? 'WhatsApp not running on gateway. Click Relink, then try again.'
        : 'WhatsApp not linked. Scan QR → Wait for scan until Connected.';
      return { ok: false, error: hint, needsRelink: !hasWhatsAppSessionCreds() };
    }

    if (!state.connected) {
      return {
        ok: false,
        error: 'WhatsApp linked but listener not ready. Try again in a few seconds.',
      };
    }

    await ensureWhatsAppChannelRunning('default');
    await syncFromGateway();

    let welcome = null;
    if (!state.welcomeSentAt) {
      try {
        welcome = await sendOmWelcomeToPhone();
      } catch (e) {
        welcome = { error: String(e.message || e) };
        state.lastError = welcome.error;
        return {
          ok: false,
          error: welcome.error,
          phone: state.linkedPhoneE164,
          welcome,
        };
      }
    }

    state.omSetupComplete = true;
    state.studioDisconnected = false;

    let projectSync = null;
    const linkedPhone = state.linkedPhoneE164 || phone;
    if (linkedPhone) {
      try {
        const tenantId = resolveTenantIdFromPhone(linkedPhone);
        projectSync = await fetchProjectSnapshot(tenantId, linkedPhone);
        if (projectSync.ok && projectSync.snapshot && typeof sendOmMessageToPhone === 'function') {
          const summary = formatSnapshotForWhatsApp(projectSync.snapshot);
          if (summary) {
            await sendOmMessageToPhone(summary, tenantId);
          }
        }
      } catch (e) {
        projectSync = { ok: false, error: String(e.message || e) };
      }
    }

    return {
      ok: true,
      phone: state.linkedPhoneE164,
      welcome,
      welcomeSentAt: state.welcomeSentAt,
      omChatReady: true,
      projectSync,
      message:
        'OM messaged your phone. Open WhatsApp (Message yourself) — your project was auto-read.',
    };
  } finally {
    state.bootstrapInFlight = false;
  }
}

module.exports = { bootstrapOmWhatsApp, OM_WELCOME_OUTBOUND };
