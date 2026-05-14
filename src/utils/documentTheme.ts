/** Persisted light/dark preference for `class` strategy Tailwind dark mode. */
const STORAGE_KEY = 'filevault-theme';

export type DocumentTheme = 'light' | 'dark';

export function getStoredTheme(): DocumentTheme {
  if (typeof window === 'undefined') return 'light';
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'dark' ? 'dark' : 'light';
}

export function applyDocumentTheme(mode: DocumentTheme): void {
  const root = document.documentElement;
  if (mode === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function setStoredTheme(mode: DocumentTheme): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore quota / private mode */
  }
  applyDocumentTheme(mode);
  window.dispatchEvent(new CustomEvent('filevault-theme', { detail: mode }));
}

export function toggleStoredTheme(): DocumentTheme {
  const next: DocumentTheme = getStoredTheme() === 'dark' ? 'light' : 'dark';
  setStoredTheme(next);
  return next;
}
