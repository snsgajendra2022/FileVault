import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThemeToggleButton from './ThemeToggleButton';
import { omBrandAccent, omHeader, omPage } from './publicMemoriesTheme';
import './PublicMemoriesShell.css';

export interface PublicMemoriesShellProps {
  children: React.ReactNode;
  /** Right side of header (sign in, register, etc.) */
  headerActions?: React.ReactNode;
  /** Show brand block with logo (login/register style) */
  showBrandBlock?: boolean;
  mainClassName?: string;
}

const PublicMemoriesShell: React.FC<PublicMemoriesShellProps> = ({
  children,
  headerActions,
  showBrandBlock = false,
  mainClassName = 'relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:pb-24',
}) => {
  const { t } = useTranslation();

  return (
    <div className={omPage}>
      <div className="om-public-grain" aria-hidden="true" />
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="om-public-orb om-public-orb-violet" />
        <div className="om-public-orb om-public-orb-fuchsia" />
        <div className="om-public-orb om-public-orb-indigo" />
      </div>

      <header className={omHeader}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          {showBrandBlock ? (
            <Link to="/" className="flex min-w-0 items-center gap-3 group">
              <img
                src="/favicon.svg"
                alt=""
                className="h-9 w-9 shrink-0 rounded-xl object-contain"
              />
              <div className="min-w-0">
                <span
                  className={`om-auth-display block truncate text-[1.35rem] font-semibold leading-tight tracking-[-0.02em] ${omBrandAccent}`}
                >
                  {t('brand.ourMemories')}
                </span>
                <span className="block truncate text-[11px] font-medium text-[#8a847a] dark:text-[#78746c]">
                  {t('login.omFooterProduct')}
                </span>
              </div>
            </Link>
          ) : (
            <Link
              to="/"
              className={`om-auth-display text-[1.25rem] font-semibold tracking-[-0.02em] ${omBrandAccent}`}
            >
              {t('brand.ourMemories')}
            </Link>
          )}

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {headerActions}
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <main className={mainClassName}>{children}</main>
    </div>
  );
};

export default PublicMemoriesShell;
