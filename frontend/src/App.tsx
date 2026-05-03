import { useState, useEffect } from 'react';
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
import type { Screen, ProcessData } from './types';

export function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [processData, setProcessData] = useState<ProcessData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supabase) {
      // No Supabase configured — dev mode, skip auth
      setIsAuthenticated(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(!!data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (!session) setScreen('login');
    });
    return () => subscription.unsubscribe();
  }, []);

  // Still resolving auth state
  if (isAuthenticated === null) return null;

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  const go = (s: Screen, data?: ProcessData) => {
    setScreen(s);
    if (data) setProcessData(data);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopNav autoSave={screen === 'review'} />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <ErrorBoundary>
          {screen === 'dashboard' && (
            <Dashboard
              onNew={() => go('upload')}
              onOpen={(runId) => { go('review', { expName: '', runId }); }}
            />
          )}
          {screen === 'upload' && (
            <UploadScreen
              onProcess={(d) => { setProcessData(d); go('processing', d); }}
              onBack={() => go('dashboard')}
            />
          )}
          {screen === 'processing' && (
            <ProcessingScreen
              expName={processData?.expName}
              runId={processData?.runId}
              onDone={() => go('review')}
              onError={() => go('dashboard')}
            />
          )}
          {screen === 'review' && (
            <ReviewScreen
              runId={processData?.runId}
              onPublish={() => go('publish')}
              onBack={() => go('dashboard')}
            />
          )}
          {screen === 'publish' && (
            <PublishConfirm
              onConfirm={() => go('published')}
              onEdit={() => go('review')}
            />
          )}
          {screen === 'published' && (
            <PublishedScreen
              onDashboard={() => go('dashboard')}
              onAnother={() => go('upload')}
            />
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}
