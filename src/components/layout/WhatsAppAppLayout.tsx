import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/context/AuthContext';

export default function WhatsAppAppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/whatsapp', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white shadow-md shadow-indigo-200">
              OM
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight text-slate-900">OM Studio</p>
              <p className="text-xs text-slate-500">WhatsApp · AI · Your project</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.username || user?.email ? (
              <span className="hidden text-sm text-slate-600 sm:inline">
                {user.username || user.email}
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Reset session
            </button>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
