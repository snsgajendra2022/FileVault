import { useCallback, useEffect, useState } from 'react';
import {
  getStoredTheme,
  setStoredTheme,
  toggleStoredTheme,
  type DocumentTheme,
} from '../utils/documentTheme';

/** Subscribe to `filevault-theme` / storage and return current light|dark. */
export function useDocumentTheme(): {
  theme: DocumentTheme;
  setTheme: (mode: DocumentTheme) => void;
  toggleTheme: () => DocumentTheme;
} {
  const [theme, setThemeState] = useState<DocumentTheme>(() => getStoredTheme());

  useEffect(() => {
    const sync = () => setThemeState(getStoredTheme());
    window.addEventListener('filevault-theme', sync);
    window.addEventListener('storage', sync);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onMq = () => {
      if (!localStorage.getItem('filevault-theme')) sync();
    };
    mq.addEventListener('change', onMq);
    return () => {
      window.removeEventListener('filevault-theme', sync);
      window.removeEventListener('storage', sync);
      mq.removeEventListener('change', onMq);
    };
  }, []);

  const setTheme = useCallback((mode: DocumentTheme) => {
    setStoredTheme(mode);
    setThemeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = toggleStoredTheme();
    setThemeState(next);
    return next;
  }, []);

  return { theme, setTheme, toggleTheme };
}
