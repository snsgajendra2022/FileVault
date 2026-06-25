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
      <main>
        <Outlet />
      </main>
    </div>
  );
}
