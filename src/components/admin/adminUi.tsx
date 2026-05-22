import React from 'react';

/** Compatible with project react-icons/fa stubs and real IconType. */
export type AdminIcon = React.ComponentType<{ className?: string; size?: string | number }>;

/** Shared admin panel theme (indigo / slate, matches PortalMenuManagement). */
export const adminPageClass = 'min-h-screen bg-slate-50';
export const adminContainerClass = 'mx-auto max-w-7xl p-4 md:p-6';

export const adminInputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20';

export const adminSelectClass = adminInputClass;

export const adminLabelClass = 'mb-1 block text-sm font-medium text-slate-700';

export const adminBtnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50';

export const adminBtnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50';

export const adminBtnDanger =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100';

export const adminCardClass = 'rounded-xl border border-slate-200 bg-white shadow-sm';

export const adminTableHeadClass =
  'bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500';

type StatTone = 'indigo' | 'blue' | 'green' | 'amber' | 'purple' | 'rose' | 'slate';

const statTones: Record<StatTone, { wrap: string; label: string; value: string }> = {
  indigo: { wrap: 'border-indigo-100 bg-indigo-50/80', label: 'text-indigo-600', value: 'text-indigo-950' },
  blue: { wrap: 'border-blue-100 bg-blue-50/80', label: 'text-blue-600', value: 'text-blue-950' },
  green: { wrap: 'border-emerald-100 bg-emerald-50/80', label: 'text-emerald-600', value: 'text-emerald-950' },
  amber: { wrap: 'border-amber-100 bg-amber-50/80', label: 'text-amber-600', value: 'text-amber-950' },
  purple: { wrap: 'border-violet-100 bg-violet-50/80', label: 'text-violet-600', value: 'text-violet-950' },
  rose: { wrap: 'border-rose-100 bg-rose-50/80', label: 'text-rose-600', value: 'text-rose-950' },
  slate: { wrap: 'border-slate-200 bg-slate-50', label: 'text-slate-600', value: 'text-slate-950' },
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
    <div className={embedded ? 'mx-auto max-w-7xl px-4 py-6 md:px-6' : adminContainerClass}>
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {badge ? (
              <div className="mb-2 flex items-center gap-2 text-indigo-600">
                {BadgeIcon ? <BadgeIcon className="h-4 w-4" /> : null}
                <span className="text-xs font-bold uppercase tracking-[0.14em]">{badge}</span>
              </div>
            ) : null}
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            {subtitle ? <p className="mt-1 max-w-2xl text-sm text-slate-600">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2 shrink-0">{actions}</div> : null}
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
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title ? <h2 className="text-sm font-semibold text-slate-900">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-sm">
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
      <div className="overflow-x-auto">
        {empty ?? children}
      </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]">
      <div
        className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl`}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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
      {Icon ? <Icon className="mb-3 h-10 w-10 text-slate-300" /> : null}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p> : null}
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
    green: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    rose: 'bg-rose-100 text-rose-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-violet-100 text-violet-800',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}
