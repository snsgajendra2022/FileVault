/**
 * Start the OpenClaw Gateway (WhatsApp + agent bridge).
 * Loads .env, ensures OpenRouter auth is synced, then spawns the gateway process.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { spawn } = require('child_process');
const path = require('path');

const { syncOpenClawOpenRouterAuth } = require('./sync-openclaw-openrouter-auth');

const gatewayBin = process.env.OPENCLAW_BIN || 'openclaw';
const projectRoot = path.join(__dirname, '..');

function resolveConfigPath() {
  return (
    process.env.OPENCLAW_CONFIG_PATH ||
    process.env.OPENCLAW_CONFIG ||
    path.join(projectRoot, '.openclaw', 'openclaw.json')
  );
}

function openclawEnv() {
  const configPath = resolveConfigPath();
  return {
    ...process.env,
    OPENCLAW_CONFIG: configPath,
    OPENCLAW_CONFIG_PATH: configPath,
  };
}

async function main() {
  const auth = syncOpenClawOpenRouterAuth();
  if (!auth.ok) {
    console.error('[run-openclaw-gateway] Auth sync failed — gateway may not reply to WhatsApp.');
  } else {
    console.log(`[run-openclaw-gateway] Auth synced → ${auth.path}`);
  }

  const env = openclawEnv();
  console.log(`[run-openclaw-gateway] Config: ${env.OPENCLAW_CONFIG_PATH}`);
  console.log(`[run-openclaw-gateway] Starting ${gatewayBin} gateway...`);

  let shuttingDown = false;
  let restartTimer = null;

  function spawnGateway() {
    const child = spawn(gatewayBin, ['gateway', 'run', '--force'], {
      cwd: projectRoot,
      env,
      stdio: 'inherit',
    });

    child.on('exit', (code, signal) => {
      if (shuttingDown) {
        process.exit(code ?? 0);
        return;
      }
      if (signal) {
        console.log(`[run-openclaw-gateway] Gateway stopped (signal=${signal})`);
        process.exit(0);
        return;
      }
      console.log(
        `[run-openclaw-gateway] Gateway exited (code=${code}) — restarting in 2s (config reload / supervisor handoff)`
      );
      restartTimer = setTimeout(spawnGateway, 2000);
    });

    process.on('SIGTERM', () => {
      shuttingDown = true;
      if (restartTimer) clearTimeout(restartTimer);
      console.log('[run-openclaw-gateway] SIGTERM — forwarding to gateway');
      child.kill('SIGTERM');
    });

    process.on('SIGINT', () => {
      shuttingDown = true;
      if (restartTimer) clearTimeout(restartTimer);
      console.log('[run-openclaw-gateway] SIGINT — forwarding to gateway');
      child.kill('SIGTERM');
    });
  }

  spawnGateway();

}

main().catch((err) => {
  console.error('[run-openclaw-gateway] Fatal:', err);
  process.exit(1);
});
