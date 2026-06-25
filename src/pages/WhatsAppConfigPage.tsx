import React from 'react';
import { WhatsAppAi } from 'whatsapp-plugin/react';

export default function WhatsAppConfigPage() {
  const apiUrl =
    process.env.REACT_APP_WHATSAPP_API_URL ||
    process.env.REACT_APP_OPENCLAW_DEV_URL ||
    'http://127.0.0.1:9093';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-100 via-white to-indigo-50/30 py-8 sm:py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <WhatsAppAi apiUrl={apiUrl} autoConnect showHeader showMessageLog />
      </div>
    </div>
  );
}
