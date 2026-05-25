import { useCallback, useEffect, useState } from 'react';
import {
  applyThemePreference,
  cycleThemePreference,
  getStoredTheme,
  getThemePreference,
  setThemePreference,
  type DocumentTheme,
  type ThemePreference,
} from '../utils/documentTheme';

export function useDocumentTheme(): {
  theme: DocumentTheme;
  preference: ThemePreference;
  setPreference: (mode: ThemePreference) => void;
  setTheme: (mode: DocumentTheme) => void;
  cycleTheme: () => ThemePreference;
  /** @deprecated Use cycleTheme */
  toggleTheme: () => ThemePreference;
} {
  const read = () => ({
    theme: getStoredTheme(),
    preference: getThemePreference(),
  });
  const [state, setState] = useState(read);

  useEffect(() => {
    const sync = () => setState(read());
    window.addEventListener('filevault-theme', sync);
    window.addEventListener('storage', sync);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onMq = () => {
      if (getThemePreference() === 'system') {
        applyThemePreference('system');
        sync();
      }
    };
    mq.addEventListener('change', onMq);
    return () => {
      window.removeEventListener('filevault-theme', sync);
      window.removeEventListener('storage', sync);
      mq.removeEventListener('change', onMq);
    };
  }, []);

  const setPreference = useCallback((mode: ThemePreference) => {
    setThemePreference(mode);
    setState({ preference: mode, theme: getStoredTheme() });
  }, []);

  const setTheme = useCallback((mode: DocumentTheme) => {
    setPreference(mode);
  }, [setPreference]);

  const cycleTheme = useCallback(() => {
    const next = cycleThemePreference();
    setState({ preference: next, theme: getStoredTheme() });
    return next;
  }, []);

  return {
    theme: state.theme,
    preference: state.preference,
    setPreference,
    setTheme,
    cycleTheme,
    toggleTheme: cycleTheme,
  };
}
