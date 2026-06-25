import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './state/context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import { SkeletonTheme, SKELETON_BASE_COLOR, SKELETON_HIGHLIGHT } from './components/common/skeletons';
import { clearNavigationState } from './utils/navigation';
import { enableInspectBlock } from './utils/blockInspect';
import { syncDocumentThemeFromStorage } from './utils/documentTheme';
import './index.css';

import WhatsAppConfigPage from './pages/WhatsAppConfigPage';
import NotFoundPage from './pages/misc/NotFoundPage';
import WhatsAppAppLayout from './components/layout/WhatsAppAppLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#25D366] border-t-transparent" />
          <p className="text-sm text-slate-600">Connecting…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route
      path="/"
      element={
        <AppShell>
          <WhatsAppAppLayout />
        </AppShell>
      }
    >
      <Route index element={<Navigate to="/whatsapp" replace />} />
      <Route path="whatsapp" element={<WhatsAppConfigPage />} />
      <Route path="studio/whatsapp" element={<Navigate to="/whatsapp" replace />} />
    </Route>

    <Route path="/login" element={<Navigate to="/whatsapp" replace />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

function App() {
  React.useEffect(() => {
    clearNavigationState();
  }, []);

  React.useEffect(() => {
    syncDocumentThemeFromStorage();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      if (localStorage.getItem('filevault-theme') === 'system' || !localStorage.getItem('filevault-theme')) {
        syncDocumentThemeFromStorage();
      }
    };
    mq.addEventListener('change', onSystemChange);
    return () => mq.removeEventListener('change', onSystemChange);
  }, []);

  React.useEffect(() => {
    enableInspectBlock();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SkeletonTheme baseColor={SKELETON_BASE_COLOR} highlightColor={SKELETON_HIGHLIGHT}>
          <AuthProvider>
            <Router>
              <AppRoutes />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                }}
              />
            </Router>
          </AuthProvider>
        </SkeletonTheme>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
