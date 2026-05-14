/// <reference types="react-scripts" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly REACT_APP_OPENCLAW_ENABLED?: string;
    readonly REACT_APP_OPENCLAW_CHAT_PATH?: string;
    readonly REACT_APP_OPENCLAW_VOICE_PATH?: string;
    readonly REACT_APP_OPENCLAW_IMAGE_PATH?: string;
    readonly REACT_APP_OPENCLAW_SESSION_PATH?: string;
    /** Local mock server (npm start) — e.g. http://192.168.1.58:9093 */
    readonly REACT_APP_OPENCLAW_DEV_URL?: string;
  }
}
