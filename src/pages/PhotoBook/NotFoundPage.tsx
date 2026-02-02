import { Link } from 'react-router-dom'

export function PhotoBookNotFoundPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-lg font-semibold text-slate-900">Page not found</div>
      <p className="mt-1 text-sm text-slate-600">The page you’re looking for doesn’t exist.</p>
      <Link
        to=".."
        relative="path"
        className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Go home
      </Link>
    </div>
  )
}

