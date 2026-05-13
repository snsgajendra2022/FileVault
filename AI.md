#  REACT_APP_API_URL=https://filevault.mytiny.us
#  ===========================================Loacl live url============================================================
#  REACT_APP_API_URL=http://10.168.89.30:9090

#  REACT_APP_API_URL=http://192.168.1.40:9090

# REACT_APP_API_URL=https://backendstudio.mytiny.us
#  REACT_APP_API_URL=https://backendstudio.mytiny.us
 REACT_APP_API_URL=http://192.168.1.40:9090
REACT_APP_BLOCK_INSPECT = true

# OpenClaw — browser calls these on REACT_APP_API_URL; Gateway credentials only on your server
REACT_APP_OPENCLAW_ENABLED=true
REACT_APP_OPENCLAW_CHAT_PATH=/api/openclaw/chat
REACT_APP_OPENCLAW_VOICE_PATH=/api/openclaw/voice
REACT_APP_OPENCLAW_IMAGE_PATH=/api/openclaw/image
REACT_APP_OPENCLAW_SESSION_PATH=/api/openclaw/session
REACT_APP_OPENCLAW_DEV_URL=http://localhost:9093
# Do not set OPENCLAW_BRIDGE_URL to this dev server (9093). Use a separate HTTP bridge that accepts POST JSON (see backend.md).
# After `openclaw onboard`, read the gateway token with: openclaw config get gateway.auth.token
# Put that same secret in OPENCLAW_BRIDGE_TOKEN only if your bridge authorizes with Bearer <token>.
# Leave empty to use OPENAI_API_KEY below (bridge is tried first when set — wrong URL breaks the pipeline).
OPENCLAW_BRIDGE_URL=http://localhost:9093
OPENCLAW_BRIDGE_TOKEN=8193d37a324dbf1f00b07ae0c9beed55d28aab0b456d942f
# OpenRouter keys look like sk-or-v1-oj-... / sk-...), use OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_API_KEY=s
# OpenRouter: use provider/model id (e.g. openai/gpt-4o-mini). Direct OpenAI: gpt-4o-mini
OPENAI_MODEL=openai/gpt-4o-mini
OPENAI_API_BASE=https://openrouter.ai/api/v1
OPENCLAW_DEV_PORT=9093
#  ===========================================Start live url============================================================
#  ===========================================Start live url============================================================
#  REACT_APP_API_URL=https://filevault.mytiny.us/
#  
#  ===========================================End live url============================================================