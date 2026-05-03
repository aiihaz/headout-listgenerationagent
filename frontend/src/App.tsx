import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { TopNav } from './components/TopNav';
import { Dashboard } from './pages/Dashboard';
import { UploadScreen } from './pages/UploadScreen';
import { ProcessingScreen } from './pages/ProcessingScreen';
import { ReviewScreen } from './pages/ReviewScreen';
import { PublishConfirm } from './pages/PublishConfirm';
import { PublishedScreen } from './pages/PublishedScreen';
import { LoginScreen } from './pages/LoginScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { supabase } from './lib/supabase';
import { useLocation } from 'react-router-dom';

function useAutoSave() {
  const { pathname } = useLocation();
  return pathname.includes('/review');
}

function AppShell() {
  const autoSave = useAutoSave();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopNav autoSave={autoSave} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/new" element={<UploadScreen />} />
            <Route path="/listings/:runId/processing" element={<ProcessingScreen />} />
            <Route path="/listings/:runId/review" element={<ReviewScreen />} />
            <Route path="/listings/:runId/publish" element={<PublishConfirm />} />
            <Route path="/listings/:runId/published" element={<PublishedScreen />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </div>
  );
}

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!supabase) {
      setIsAuthenticated(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(!!data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (!session) navigate('/dashboard');
    });
    return () => subscription.unsubscribe();
  }, []);

  if (isAuthenticated === null) return null;

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return <AppShell />;
}
