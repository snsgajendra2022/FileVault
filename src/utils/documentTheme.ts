/** Persisted theme preference for Tailwind `dark` class on `<html>`. */
const STORAGE_KEY = 'filevault-theme';

export type DocumentTheme = 'light' | 'dark';

/** User choice: explicit light/dark or follow OS (default). */
export type ThemePreference = DocumentTheme | 'system';

const CYCLE_ORDER: ThemePreference[] = ['system', 'light', 'dark'];

function systemResolvedTheme(): DocumentTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === 'dark' || v === 'light' || v === 'system') return v;
  return 'system';
}

/** Resolved appearance currently applied on `<html>`. */
export function getStoredTheme(): DocumentTheme {
  const pref = getThemePreference();
  if (pref === 'dark' || pref === 'light') return pref;
  return systemResolvedTheme();
}

export function applyDocumentTheme(mode: DocumentTheme): void {
  const root = document.documentElement;
  if (mode === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

function dispatchThemeChange(preference: ThemePreference, resolved: DocumentTheme): void {
  window.dispatchEvent(
    new CustomEvent('filevault-theme', { detail: { preference, resolved } })
  );
}

/** Apply preference to `<html>` and return resolved light/dark. */
export function applyThemePreference(preference: ThemePreference): DocumentTheme {
  const resolved = preference === 'system' ? systemResolvedTheme() : preference;
  applyDocumentTheme(resolved);
  return resolved;
}

/** Apply stored preference (or system default). Call at app boot and on changes. */
export function syncDocumentThemeFromStorage(): DocumentTheme {
  const preference = getThemePreference();
  return applyThemePreference(preference);
}

export function setThemePreference(preference: ThemePreference): DocumentTheme {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    /* ignore quota / private mode */
  }
  const resolved = applyThemePreference(preference);
  dispatchThemeChange(preference, resolved);
  return resolved;
}

/** @deprecated Use setThemePreference — kept for callers that only set light/dark. */
export function setStoredTheme(mode: DocumentTheme): DocumentTheme {
  return setThemePreference(mode);
}

/** Cycle: system → light → dark → system. */
export function cycleThemePreference(): ThemePreference {
  const current = getThemePreference();
  const idx = CYCLE_ORDER.indexOf(current);
  const next = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
  setThemePreference(next);
  return next;
}

/** @deprecated Use cycleThemePreference. */
export function toggleStoredTheme(): DocumentTheme {
  cycleThemePreference();
  return getStoredTheme();
}

export function isSystemThemePreference(): boolean {
  return getThemePreference() === 'system';
}
