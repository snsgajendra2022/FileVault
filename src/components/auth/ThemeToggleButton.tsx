import React from 'react';
import { useTranslation } from 'react-i18next';
import { IoMoon, IoSunny } from 'react-icons/io5';
import { useDocumentTheme } from '../../hooks/useDocumentTheme';

const ThemeToggleButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useDocumentTheme();

  return (
    <button
      type="button"
      onClick={() => toggleTheme()}
      className={`rounded-full border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-amber-200 dark:hover:text-amber-100 dark:hover:bg-white/10 transition-colors ${className}`}
      aria-label={theme === 'dark' ? t('header.switchToLight', 'Light mode') : t('header.switchToDark', 'Dark mode')}
    >
      {theme === 'dark' ? <IoSunny className="h-4 w-4" /> : <IoMoon className="h-4 w-4" />}
    </button>
  );
};

export default ThemeToggleButton;
