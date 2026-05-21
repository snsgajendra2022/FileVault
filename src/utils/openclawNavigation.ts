/**
 * OpenClaw assistant: optional in-app navigation.
 * API may return `navigateTo` (see backend.md). We also match common English phrases locally
 * so navigation works with the dev mock or when the backend omits `navigateTo`.
 */

const ALLOWED = new Set<string>([
  '/memories/events',
  '/memories/events/new',
  '/memories/dashboard',
  '/memories/shared',
  '/photo-themes',
  '/photo-book',
  '/phonebook',
  '/studio/dashboard',
  '/studio/albums',
  '/studio/openclaw',
  '/studio/whatsapp',
  '/filter-images',
  '/upload-family-images',
  '/client-images',
  '/studio/shared-albums',
  '/studio/clients',
  '/studio/payments',
  '/studio/payment-management',
  '/studio/select-pay',
  '/studio/members',
  '/studio/members-tree',
  '/studio/members-tree',
  '/studio/create-members',
  '/studio/services',
  '/studio/settings',
  '/studio/admin',
  '/studio/admin-dashboard',
  '/studio/admin-users',
  '/studio/admin-services',
  '/studio/admin-settings',
  '/studio/admin-dashboard',
]);

export function sanitizeOpenClawNavigatePath(path: string | undefined | null): string | null {
  if (!path || typeof path !== 'string') return null;
  const p = path.split('?')[0].trim();
  if (!p.startsWith('/') || p.includes('//')) return null;
  if (ALLOWED.has(p)) return p;
  return null;
}

export function pickNavigateToFromApi(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const direct = sanitizeOpenClawNavigatePath(d.navigateTo as string);
  if (direct) return direct;
  const nav = d.navigation;
  if (nav && typeof nav === 'object') {
    const path = (nav as { path?: string }).path;
    return sanitizeOpenClawNavigatePath(path);
  }
  return null;
}

type RouteRule = { path: string; patterns: RegExp[] };

const RULES: RouteRule[] = [
  {
    path: '/memories/events/new',
    patterns: [
      /\b(new|create)\s+(an?\s+)?events?\b/i,
      /\bevents?\s+(new|create)\b/i,
      /\bnew\s+memories?\s+events?\b/i,
    ],
  },
  {
    path: '/memories/dashboard',
    patterns: [/\bmemories?\s+dashboard\b/i, /\bour\s+memories?\s+home\b/i],
  },
  {
    path: '/memories/shared',
    patterns: [/\bshared\s+with\s+me\b/i, /\bmemories?\s+shared\b/i],
  },
  {
    path: '/memories/events',
    patterns: [
      /\b(get|open|go\s+to|show|list|view)\s+(the\s+)?events?\b/i,
      /\b(events?\s+(get|list|open|page))\b/i,
      /\bevents?\s+(please|now)\b/i,
      /\b(open\s+)?memories?\s+events?\b/i,
      /\b(event|events)\b/i,
    ],
  },
  {
    path: '/studio/albums',
    patterns: [
      /\b(go\s+to\s+)?my\s+albums?\b/i,
      /\bopen\s+(my\s+)?(photo\s*)?albums?\b/i,
      /\bstudio\s+albums?\b/i,
      /\balbums?\s+page\b/i,
      /^\s*albums?\s*$/i,
      /^\s*album\s*$/i,
    ],
  },
  { path: '/photo-themes', patterns: [/\bphoto\s*themes?\b/i, /\bthemes?\s+page\b/i] },
  { path: '/photo-book', patterns: [/\bphoto\s*books?\b/i] },
  { path: '/phonebook', patterns: [/\bphone\s*book\b/i, /\bcontacts?\s+list\b/i] },
  { path: '/studio/dashboard', patterns: [/\bstudio\s+dashboard\b/i, /^\s*dashboard\s*$/i] },
  { path: '/upload-family-images', patterns: [/\bupload\s+family\b/i, /\bfamily\s+upload\b/i] },
  { path: '/client-images', patterns: [/\bmy\s+images\b/i, /\bclient\s+images\b/i] },
  { path: '/studio/openclaw', patterns: [/\bopen\s*claw\b/i, /\bassistant\s+page\b/i, /\bom\s+assistant\b/i] },
  { path: '/studio/whatsapp', patterns: [/\bwhatsapp\b/i, /\bwhats\s*app\b/i] },
  { path: '/filter-images', patterns: [/\bface\s*filter\b/i, /\bfilter\s+images\b/i, /\bfacesync\b/i] },
];

export function matchOpenClawLocalRoute(message: string): string | null {
  const s = message.trim();
  if (!s) return null;
  for (const { path, patterns } of RULES) {
    for (const re of patterns) {
      if (re.test(s)) return sanitizeOpenClawNavigatePath(path);
    }
  }
  return null;
}
