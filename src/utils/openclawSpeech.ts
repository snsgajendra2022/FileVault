/**
 * Browser speech synthesis helpers for the OpenClaw assistant (event readouts, reply TTS).
 */

export function stopSpeechSynthesis(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function isSpeechSynthesisActive(): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  return window.speechSynthesis.speaking || window.speechSynthesis.pending;
}

export function isSpeechSynthesisAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';
}

/**
 * Queue speech without cancelling what is already playing — the browser queues utterances.
 * Use {@link stopSpeechSynthesis} to stop everything.
 */
export function enqueueSpeech(text: string, lang?: string): void {
  if (!isSpeechSynthesisAvailable()) return;
  const clean = text.trim();
  if (!clean) return;
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = lang || (typeof document !== 'undefined' ? document.documentElement.lang : '') || 'en-US';
  window.speechSynthesis.speak(u);
}

/** @deprecated Use {@link enqueueSpeech} — kept for clarity in older call sites. */
export const speakText = enqueueSpeech;

/** Strip navigation hints before speaking assistant text. */
export function textForAssistantSpeech(display: string): string {
  let s = display.trim();
  s = s.replace(/\n*NAVIGATE:\/[^\s]+\s*$/i, '').trim();
  return s.replace(/\n+/g, ' ');
}

/** Voice/text: read Memories events aloud (name + date). */
/** Voice/text: read the event open on the current page (Memories event detail). */
export function isAnnounceThisEventCommand(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length < 8) return false;
  return (
    /\b(announce|read|tell\s+me|speak|say)\s+(this|the|current)\s+events?\b/.test(t) ||
    /\b(this|the|current)\s+events?\s+(please\s+)?(read|announce|aloud)\b/.test(t) ||
    /\bwhat\s+(is\s+)?(this|the)\s+events?\b/.test(t) ||
    /\bdescribe\s+(this|the)\s+events?\b/.test(t)
  );
}

/** Voice/text: open the assistant’s image file chooser. */
export function isOpenImagePickerCommand(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    /\b(attach|add|upload|open|choose|select)\s+(an?\s+)?(image|photo|picture)\b/.test(t) ||
    /\bimage\s+picker\b/.test(t) ||
    /\bopen\s+(the\s+)?(gallery|photo\s+chooser)\b/.test(t) ||
    /^\s*(pick\s+a\s+photo|choose\s+a\s+photo)\s*$/i.test(text.trim())
  );
}

export function isAnnounceEventsCommand(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length < 6) return false;
  return (
    /\b(announce|read|tell\s+me|speak|say)\s+(me\s+)?(my\s+)?(memories\s+)?events?\b/.test(t) ||
    /\b(memories\s+)?events?\s+(please\s+)?(read|announce|aloud|out\s+loud)\b/.test(t) ||
    /\bwhat\s+events?\s+(do\s+i\s+have|are\s+(there|coming))\b/.test(t) ||
    /\blist\s+(my\s+)?(memories\s+)?events?\b/.test(t) ||
    /\bread\s+(out\s+)?(my\s+)?(memories\s+)?events?\b/.test(t)
  );
}

/**
 * Stop current speech. If nothing is playing, only matches explicit stop-phrases
 * so short "stop" still reaches the assistant API.
 */
export function isStopSpeechCommand(text: string): boolean {
  const speaking = isSpeechSynthesisActive();
  const t = text.trim().toLowerCase();
  if (!speaking) {
    return (
      /\bstop\s+(speaking|reading|announc(?:ing|e|ements))\b/.test(t) ||
      /^cancel\s+speech$/.test(t) ||
      /^silence$/.test(t) ||
      /^quiet$/.test(t)
    );
  }
  return (
    /^(stop|quiet|silence)([\s!.?]*)$/i.test(text.trim()) ||
    /^stop\s+speaking\b/i.test(t) ||
    /\bstop\s+(the\s+)?(speech|voice|reading)\b/i.test(t)
  );
}
