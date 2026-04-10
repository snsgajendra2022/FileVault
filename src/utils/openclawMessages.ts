/**
 * Clean up dev-mock / verbose assistant text before showing in the UI.
 */
export function polishAssistantReplyForDisplay(raw: string): string {
  let s = raw.trim();
  if (!s) return s;

  s = s.replace(/^\[OpenClaw dev mock[^\]]*\]\s*/i, '');
  s = s.replace(/^Transcript:\s*/i, '');
  s = s.replace(/^You:\s*[^\n]+\n*/i, '');
  s = s.replace(/\n*Context:\s*\{[^}]*\}\s*/g, '');
  s = s.replace(/\n*Context:\s*[^\n]+/gi, '');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}
