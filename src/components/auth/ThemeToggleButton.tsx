import React from 'react';
import { useTranslation } from 'react-i18next';
import { IoContrast, IoMoon, IoSunny } from 'react-icons/io5';
import { useDocumentTheme } from '../../hooks/useDocumentTheme';
import type { ThemePreference } from '../../utils/documentTheme';

const PREFERENCE_META: Record<
  ThemePreference,
  { Icon: typeof IoSunny; labelKey: string; fallback: string; nextKey: string; nextFallback: string }
> = {
  system: {
    Icon: IoContrast,
    labelKey: 'header.themeSystem',
    fallback: 'System (default)',
    nextKey: 'header.themeCycleToLight',
    nextFallback: 'System theme — click for light mode',
  },
  light: {
    Icon: IoSunny,
    labelKey: 'header.themeLight',
    fallback: 'Light mode',
    nextKey: 'header.themeCycleToDark',
    nextFallback: 'Light mode — click for dark mode',
  },
  dark: {
    Icon: IoMoon,
    labelKey: 'header.themeDark',
    fallback: 'Dark mode',
    nextKey: 'header.themeCycleToSystem',
    nextFallback: 'Dark mode — click for system (default)',
  },
};

const ThemeToggleButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation();
  const { theme, preference, cycleTheme } = useDocumentTheme();

  const meta = PREFERENCE_META[preference];
  const { Icon } = meta;
  const label = t(meta.labelKey, meta.fallback);
  const nextHint = t(meta.nextKey, meta.nextFallback);
  const resolvedHint =
    preference === 'system'
      ? theme === 'dark'
        ? t('header.themeSystemLooksDark', 'Looks dark (OS)')
        : t('header.themeSystemLooksLight', 'Looks light (OS)')
      : null;

  return (
    <button
      type="button"
      onClick={() => cycleTheme()}
      title={resolvedHint ? `${label} · ${resolvedHint}` : label}
      className={`relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[rgba(20,18,16,0.12)] bg-[#ffffff] p-2.5 text-[#64748b] shadow-sm transition-all duration-200 hover:bg-[#eff6ff] hover:text-[#0f172a] dark:border-white/10 dark:bg-white/5 dark:text-amber-200 dark:hover:bg-white/10 dark:hover:text-amber-100 sm:min-h-0 sm:min-w-0 ${className}`}
      aria-label={`${label}. ${nextHint}`}
      aria-pressed={preference !== 'system' && theme === 'dark'}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {preference === 'system' ? (
        <span
          className={`absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full ring-1 ring-white dark:ring-slate-900 ${
            theme === 'dark' ? 'bg-indigo-400' : 'bg-amber-400'
          }`}
          aria-hidden
        />
      ) : null}
      <span className="sr-only">{label}</span>
    </button>
  );
};

export default ThemeToggleButton;
