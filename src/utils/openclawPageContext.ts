/**
 * Route-derived context for OpenClaw (assistant is mounted outside nested <Route>, so use pathname).
 */

export function parseMemoriesEventIdFromPath(pathname: string): string | null {
  const p = (pathname.split('?')[0] || '').replace(/\/+$/, '') || '/';
  const m = p.match(/^\/memories\/events\/([^/]+)$/);
  if (!m || m[1] === 'new') return null;
  return m[1];
}

export type OpenClawMemoriesEventSnapshot = {
  id: string;
  name: string;
  dateTime: string;
  location: string;
  imageCount: number;
};

export function buildOpenClawContextPayload(
  pathname: string,
  event?: OpenClawMemoriesEventSnapshot | null
): Record<string, unknown> {
  const path = pathname.split('?')[0] || '/';
  const out: Record<string, unknown> = { path };
  if (event && event.id) {
    out.memoriesEvent = {
      id: event.id,
      name: event.name,
      dateTime: event.dateTime,
      location: event.location,
      imageCount: event.imageCount,
    };
  }
  return out;
}
