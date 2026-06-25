import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { FaWhatsapp, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../../state/context/AuthContext';

/**
 * Minimal white layout for the OM WhatsApp plugin demo app.
 */
export default function WhatsAppAppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/whatsapp', { replace: true });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#25D366]/10 text-[#25D366]">
              <FaWhatsapp className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">OM WhatsApp</p>
              <p className="text-xs text-slate-500">Connect · Message · AI replies</p>
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
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <FaSignOutAlt className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
