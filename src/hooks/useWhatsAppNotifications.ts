import { useEffect, useRef } from 'react';
import type { WhatsAppLogEntry } from '../components/OmAiWhatsappConfig';

function canNotify(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
}

async function ensurePermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/** Browser notifications for new inbound WhatsApp messages (self-chat + OM only). */
export function useWhatsAppNotifications(
  messages: WhatsAppLogEntry[] | undefined,
  enabled = true,
): void {
  const seenRef = useRef<Set<string>>(new Set());
  const primedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    ensurePermission().catch(() => {});
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !messages?.length) return;

    if (!primedRef.current) {
      messages.forEach((m) => seenRef.current.add(m.id));
      primedRef.current = true;
      return;
    }

    if (!canNotify()) return;

    for (const entry of messages) {
      if (seenRef.current.has(entry.id)) continue;
      seenRef.current.add(entry.id);
      if (entry.direction !== 'inbound') continue;

      const title =
        entry.from === 'om' || entry.to === 'om'
          ? 'OM WhatsApp'
          : 'New message (you)';
      const body = (entry.text || 'New activity').slice(0, 180);
      try {
        new Notification(title, { body, tag: entry.id });
      } catch {
        /* ignore */
      }
    }
  }, [messages, enabled]);
}
