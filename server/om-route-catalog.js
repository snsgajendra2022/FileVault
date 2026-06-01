/**
 * OM in-app routes aligned with src/App.tsx (protected + common studio paths).
 * Used for keyword routing and WhatsApp deep links.
 */

const OM_ROUTES = [
  { path: '/memories/events', label: 'Memories events', patterns: [/\b(list|show|get|open|my)\s+(memories?\s+)?events?\b/i, /\bevents?\s+list\b/i, /\b(open\s+)?memories?\s+events?\b/i, /\b(event|events)\b/i] },
  { path: '/memories/events/new', label: 'Create event', patterns: [/\b(create|new|add)\s+(an?\s+)?events?\b/i, /\bevents?\s+(new|create)\b/i] },
  { path: '/memories/dashboard', label: 'Memories home', patterns: [/\bmemories?\s+dashboard\b/i, /\bour\s+memories?\s+home\b/i] },
  { path: '/memories/shared', label: 'Shared with me', patterns: [/\bshared\s+with\s+me\b/i, /\bmemories?\s+shared\b/i] },
  { path: '/studio/dashboard', label: 'Studio dashboard', patterns: [/\bstudio\s+dashboard\b/i, /^\s*dashboard\s*$/i] },
  { path: '/studio/albums', label: 'Albums', patterns: [/\b(my\s+)?albums?\b/i, /\bstudio\s+albums?\b/i] },
  { path: '/studio/clients', label: 'Clients', patterns: [/\bstudio\s+clients?\b/i, /\bclient\s+management\b/i] },
  { path: '/studio/gallery', label: 'Gallery', patterns: [/\bphoto\s+gallery\b/i, /\bstudio\s+gallery\b/i] },
  { path: '/studio/whatsapp', label: 'WhatsApp settings', patterns: [/\bwhatsapp\s+settings\b/i] },
  { path: '/studio/openclaw', label: 'OM assistant', patterns: [/\bom\s+assistant\b/i, /\bopen\s*claw\b/i] },
  { path: '/studio/settings', label: 'Studio settings', patterns: [/\bstudio\s+settings\b/i] },
  { path: '/studio/payments', label: 'Payments', patterns: [/\bstudio\s+payments?\b/i] },
  { path: '/studio/shared-albums', label: 'Shared albums', patterns: [/\bshared\s+albums?\b/i] },
  { path: '/photo-themes', label: 'Photo themes', patterns: [/\bphoto\s*themes?\b/i] },
  { path: '/photo-book', label: 'Photo books', patterns: [/\bphoto\s*books?\b/i] },
  { path: '/phonebook', label: 'Phone book', patterns: [/\bphone\s*book\b/i, /\bcontacts?\b/i] },
  { path: '/phonebook/new', label: 'New contact', patterns: [/\b(new|add)\s+contact\b/i, /\bcreate\s+contact\b/i] },
  { path: '/client-images', label: 'My images', patterns: [/\bmy\s+images\b/i, /\bclient\s+images\b/i] },
  { path: '/upload-family-images', label: 'Family upload', patterns: [/\bupload\s+family\b/i, /\bfamily\s+upload\b/i] },
  { path: '/upload', label: 'Upload', patterns: [/\bupload\s+(photos?|images?)\b/i, /^\s*upload\s*$/i] },
  { path: '/filter-images', label: 'Face filter', patterns: [/\bface\s*filter\b/i, /\bfilter\s+images\b/i, /\bfacesync\b/i] },
  { path: '/invitations', label: 'Invitations', patterns: [/\binvitations?\b/i] },
  { path: '/connections', label: 'Connections', patterns: [/\bconnections?\b/i] },
  { path: '/family-tree', label: 'Family tree', patterns: [/\bfamily\s+tree\b/i] },
  { path: '/services', label: 'Services', patterns: [/\bservices?\s+page\b/i] },
  { path: '/settings', label: 'Settings', patterns: [/\b(settings|preferences)\b/i] },
  { path: '/profile', label: 'Profile', patterns: [/\bmy\s+profile\b/i, /^\s*profile\s*$/i] },
];

const ALLOWED_NAV = new Set(OM_ROUTES.map((r) => r.path));

function sanitizeNavigatePath(p) {
  if (!p || typeof p !== 'string') return null;
  const path = p.split('?')[0].trim();
  if (!path.startsWith('/') || path.includes('//')) return null;
  return ALLOWED_NAV.has(path) ? path : null;
}

function labelForPath(path) {
  const row = OM_ROUTES.find((r) => r.path === path);
  return row?.label || path;
}

function matchRouteFromText(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^\s*help\s*$/i.test(s) || /\b(what can you do|commands|menu)\b/i.test(s)) return '__help__';
  for (const row of OM_ROUTES) {
    for (const re of row.patterns) {
      if (re.test(s)) return row.path;
    }
  }
  return null;
}

function getWebAppBase() {
  const base =
    (process.env.OM_WEB_APP_URL || process.env.REACT_APP_WEB_URL || process.env.REACT_APP_PUBLIC_URL || '')
      .trim() || 'http://localhost:3000';
  return base.replace(/\/$/, '');
}

function buildDeepLink(path) {
  const safe = sanitizeNavigatePath(path);
  if (!safe) return null;
  return `${getWebAppBase()}${safe}`;
}

function buildHelpMenuText() {
  const lines = [
    'OM on WhatsApp — you can:',
    '• List/create events, albums, images, contacts (when logged in on web)',
    '• Send photos here to upload to your OM library',
    '• Get a link to open any studio page in the browser',
    '',
    'Try:',
    '• "list my events" / "create event Summer Party"',
    '• "my albums" / "phone book" / "upload family"',
    '• "open memories dashboard" / "photo themes"',
    '',
    'Pages I can link:',
    ...OM_ROUTES.slice(0, 16).map((r) => `• ${r.label} — say "${r.label.toLowerCase()}"`),
    '',
    'Uploads: send a photo in this chat, or say "upload" for the browser upload page.',
    'Say *help* anytime for this menu.',
  ];
  return lines.join('\n');
}

module.exports = {
  OM_ROUTES,
  ALLOWED_NAV,
  sanitizeNavigatePath,
  labelForPath,
  matchRouteFromText,
  getWebAppBase,
  buildDeepLink,
  buildHelpMenuText,
};
