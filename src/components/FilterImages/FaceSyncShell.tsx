import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import './faceSync.css';

const NAV = [
  { to: '/filter-images/photos', label: 'Photos' },
  { to: '/filter-images/people', label: 'People' },
  { to: '/filter-images/suggestions', label: 'Suggestions' },
  { to: '/filter-images/upload', label: 'Upload' },
] as const;

const FaceSyncShell: React.FC = () => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const navigate = useNavigate();
  const [globalSearch, setGlobalSearch] = React.useState('');

  const onGlobalSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const q = globalSearch.trim();
    navigate(q ? `/filter-images/people?q=${encodeURIComponent(q)}` : '/filter-images/people');
  };

  return (
    <div className="font-sans antialiased text-slate-900">
      <a className="skip-link" href="#filter-images-main">
        Skip to main content
      </a>
      <div className="app-shell lg:grid lg:grid-cols-[280px_1fr]">
        <aside className="desktop-sidebar sidebar-rail border-r border-slate-200/80 bg-white/90 p-6 backdrop-blur-xl">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/25">
              F
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">FaceSync</h1>
              <p className="text-xs text-slate-500">Face intelligence</p>
            </div>
          </div>
          <nav className="space-y-1.5" aria-label="Primary">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main id="filter-images-main" className="page-enter min-h-0">
          <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm backdrop-blur-xl lg:px-8">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="mobile-nav-trigger rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/30 lg:hidden"
                onClick={() => setMobileOpen((o) => !o)}
              >
                Menu
              </button>
              <div className="hidden min-w-0 flex-1 md:block">
                <input
                  type="search"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  onKeyDown={onGlobalSearch}
                  autoComplete="off"
                  className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200/80"
                  placeholder="Search people — Enter to open grid"
                />
              </div>
              <Link
                to="/studio/dashboard"
                className="ml-auto rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Back to studio
              </Link>
            </div>
            {mobileOpen && (
              <div className="mt-3 space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:hidden">
                {NAV.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) => `sidebar-link block${isActive ? ' is-active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
          </header>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default FaceSyncShell;
