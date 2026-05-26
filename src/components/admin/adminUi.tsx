import React from 'react';
import './adminTheme.css';

/** Compatible with project react-icons/fa stubs and real IconType. */
export type AdminIcon = React.ComponentType<{ className?: string; size?: string | number }>;

/** Shared admin panel theme (indigo / slate, matches PortalMenuManagement). */
export const adminPageClass =
  'admin-scope admin-panel-page min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200';
export const adminContainerClass = 'mx-auto max-w-7xl p-4 md:p-6';

export const adminInputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/25';

export const adminSelectClass = adminInputClass;

export const adminLabelClass =
  'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300';

export const adminBtnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400';

export const adminBtnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';

export const adminBtnDanger =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50';

export const adminCardClass =
  'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';

export const adminTableHeadClass =
  'bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/90 dark:text-slate-400';

type StatTone = 'indigo' | 'blue' | 'green' | 'amber' | 'purple' | 'rose' | 'slate';

const statTones: Record<StatTone, { wrap: string; label: string; value: string }> = {
  indigo: {
    wrap: 'border-indigo-100 bg-indigo-50/80 dark:border-indigo-900/50 dark:bg-indigo-950/40',
    label: 'text-indigo-600 dark:text-indigo-400',
    value: 'text-indigo-950 dark:text-indigo-100',
  },
  blue: {
    wrap: 'border-blue-100 bg-blue-50/80 dark:border-blue-900/50 dark:bg-blue-950/40',
    label: 'text-blue-600 dark:text-blue-400',
    value: 'text-blue-950 dark:text-blue-100',
  },
  green: {
    wrap: 'border-emerald-100 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/40',
    label: 'text-emerald-600 dark:text-emerald-400',
    value: 'text-emerald-950 dark:text-emerald-100',
  },
  amber: {
    wrap: 'border-amber-100 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/40',
    label: 'text-amber-600 dark:text-amber-400',
    value: 'text-amber-950 dark:text-amber-100',
  },
  purple: {
    wrap: 'border-violet-100 bg-violet-50/80 dark:border-violet-900/50 dark:bg-violet-950/40',
    label: 'text-violet-600 dark:text-violet-400',
    value: 'text-violet-950 dark:text-violet-100',
  },
  rose: {
    wrap: 'border-rose-100 bg-rose-50/80 dark:border-rose-900/50 dark:bg-rose-950/40',
    label: 'text-rose-600 dark:text-rose-400',
    value: 'text-rose-950 dark:text-rose-100',
  },
  slate: {
    wrap: 'border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/60',
    label: 'text-slate-600 dark:text-slate-400',
    value: 'text-slate-950 dark:text-slate-100',
  },
};

export function AdminShell({
  badge,
  badgeIcon: BadgeIcon,
  title,
  subtitle,
  actions,
  children,
  embedded = false,
}: {
  badge?: string;
  badgeIcon?: AdminIcon;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** When true, used inside AdminPage tab layout (no duplicate page background). */
  embedded?: boolean;
}) {
  const inner = (
    <div className={embedded ? 'admin-scope mx-auto max-w-7xl px-4 py-6 md:px-6' : adminContainerClass}>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {badge ? (
            <div className="mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              {BadgeIcon ? <BadgeIcon className="h-4 w-4" /> : null}
              <span className="text-xs font-bold uppercase tracking-[0.14em]">{badge}</span>
            </div>
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
          {subtitle ? (
            <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
  return embedded ? inner : <div className={adminPageClass}>{inner}</div>;
}

export function AdminCard({
  title,
  description,
  children,
  className = '',
  headerRight,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
}) {
  return (
    <section className={`${adminCardClass} ${className}`}>
      {title || description || headerRight ? (
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            {title ? (
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
            ) : null}
          </div>
          {headerRight}
        </div>
      ) : null}
      <div className={title || description || headerRight ? 'p-5' : 'p-5'}>{children}</div>
    </section>
  );
}

export function AdminStatGrid({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>{children}</div>
  );
}

export function AdminStatCard({
  label,
  value,
  hint,
  tone = 'indigo',
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: StatTone;
  icon?: AdminIcon;
}) {
  const t = statTones[tone];
  return (
    <div className={`rounded-xl border p-4 ${t.wrap}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-wide ${t.label}`}>{label}</p>
          <p className={`mt-1 text-2xl font-bold ${t.value}`}>{value}</p>
          {hint ? <p className={`mt-1 text-xs ${t.label}`}>{hint}</p> : null}
        </div>
        {Icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-sm dark:bg-slate-800/80">
            <Icon className={`h-5 w-5 ${t.label}`} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AdminFiltersBar({ children }: { children: React.ReactNode }) {
  return (
    <AdminCard className="mb-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">{children}</div>
    </AdminCard>
  );
}

export function AdminFilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={adminLabelClass}>{label}</label>
      {children}
    </div>
  );
}

export function AdminTableWrap({
  children,
  empty,
}: {
  children: React.ReactNode;
  empty?: React.ReactNode;
}) {
  return (
    <AdminCard className="overflow-hidden p-0">
      <div className="overflow-x-auto">{empty ?? children}</div>
    </AdminCard>
  );
}

export function AdminModal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="admin-scope fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] dark:bg-black/60">
      <div
        className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900`}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon?: AdminIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon ? <Icon className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" /> : null}
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">{description}</p>
      ) : null}
    </div>
  );
}

export function AdminBadge({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode;
  tone?: 'green' | 'amber' | 'rose' | 'indigo' | 'slate' | 'blue' | 'purple';
}) {
  const tones = {
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    rose: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
    indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
    purple: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}
