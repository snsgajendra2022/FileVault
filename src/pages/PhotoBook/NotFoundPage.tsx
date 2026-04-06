import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function PhotoBookNotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-lg font-semibold text-slate-900">{t('photoBookNotFound.title')}</div>
      <p className="mt-1 text-sm text-slate-600">{t('photoBookNotFound.description')}</p>
      <Link
        to=".."
        relative="path"
        className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        {t('photoBookNotFound.goHome')}
      </Link>
    </div>
  )
}
