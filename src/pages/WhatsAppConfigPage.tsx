import React from 'react';
import { WhatsAppAi } from 'whatsapp-plugin/react';

/**
 * Demo app page — same as using the library in your project.
 */
export default function WhatsAppConfigPage() {
  const apiUrl =
    process.env.REACT_APP_WHATSAPP_API_URL ||
    process.env.REACT_APP_OPENCLAW_DEV_URL ||
    'http://127.0.0.1:9093';

  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <div className="mx-auto max-w-3xl px-4">
        <WhatsAppAi apiUrl={apiUrl} autoConnect showHeader showMessageLog />
      </div>
    </div>
  );
}
