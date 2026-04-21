import React, { type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePhotoBookStore } from '../../state/stores/photobookStore'

function PhotoBookNavLink({ to, end, children }: { to: string; end?: boolean; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          'rounded-full px-3 py-1 text-sm font-medium transition',
          isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-white/70',
        ].join(' ')
      }
    >
      {children}
    </NavLink>
  )
}

export function PhotoBookLayout() {
  const { t } = useTranslation()
  const hasAlbum = usePhotoBookStore((s) => Boolean(s.album))
  const resetAll = usePhotoBookStore((s) => s.resetAll)
  const hydratePhotosFromDb = usePhotoBookStore((s) => s.hydratePhotosFromDb)

  React.useEffect(() => {
    void hydratePhotosFromDb()
  }, [hydratePhotosFromDb])

  return (
    <div
      className="min-h-full rounded-2xl border border-slate-200/60 bg-white/70 shadow-sm"
      style={{
        background:
          'radial-gradient(1200px 800px at 20% 10%, #e0f2fe 0%, transparent 55%), radial-gradient(1200px 800px at 80% 10%, #ede9fe 0%, transparent 55%), linear-gradient(#f8fafc, #f1f5f9)',
      }}
    >
      <header className="sticky top-0 z-10 border-b border-slate-200/60 bg-white/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <NavLink to="." end className="font-semibold tracking-tight text-slate-900">
            {t('photoBookLayout.brand')}
          </NavLink>
          <nav className="flex items-center gap-2">
            <PhotoBookNavLink to="." end>
              {t('photoBookLayout.navTemplates')}
            </PhotoBookNavLink>
            <PhotoBookNavLink to="editor">{t('photoBookLayout.navEditor')}</PhotoBookNavLink>
            <PhotoBookNavLink to="preview">{t('photoBookLayout.navPreview')}</PhotoBookNavLink>
          </nav>
          <div className="flex items-center gap-2">
            {hasAlbum ? (
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                onClick={resetAll}
              >
                {t('photoBookLayout.reset')}
              </button>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
