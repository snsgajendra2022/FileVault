import React, { createContext, useContext, useMemo } from 'react';

export type WhatsAppAiConfig = {
  apiUrl: string;
  authToken?: string | null;
  userId?: string | null;
};

const Ctx = createContext<WhatsAppAiConfig | null>(null);

export function WhatsAppAiProvider({
  apiUrl,
  authToken,
  userId,
  children,
}: WhatsAppAiConfig & { children: React.ReactNode }) {
  const value = useMemo(
    () => ({
      apiUrl: apiUrl.replace(/\/$/, ''),
      authToken: authToken ?? null,
      userId: userId ?? null,
    }),
    [apiUrl, authToken, userId]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWhatsAppAiConfig(): WhatsAppAiConfig {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('WhatsAppAi must be used inside WhatsAppAiProvider');
  }
  return ctx;
}
