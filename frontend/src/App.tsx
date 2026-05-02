import { useState } from 'react';
import { TopNav } from './components/TopNav';
import { Dashboard } from './pages/Dashboard';
import { UploadScreen } from './pages/UploadScreen';
import { ProcessingScreen } from './pages/ProcessingScreen';
import { ReviewScreen } from './pages/ReviewScreen';
import { PublishConfirm } from './pages/PublishConfirm';
import { PublishedScreen } from './pages/PublishedScreen';
import type { Screen, ProcessData, ListingRow } from './types';

export function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [processData, setProcessData] = useState<ProcessData | null>(null);
  const [_selectedListing, setSelectedListing] = useState<ListingRow | null>(null);

  const go = (s: Screen, data?: ProcessData) => {
    setScreen(s);
    if (data) setProcessData(data);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopNav autoSave={screen === 'review'} />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {screen === 'dashboard' && (
          <Dashboard
            onNew={() => go('upload')}
            onOpen={(l) => { setSelectedListing(l); go('review'); }}
          />
        )}
        {screen === 'upload' && (
          <UploadScreen
            onProcess={(d) => { setProcessData(d); go('processing'); }}
            onBack={() => go('dashboard')}
          />
        )}
        {screen === 'processing' && (
          <ProcessingScreen
            expName={processData?.expName}
            onDone={() => go('review')}
          />
        )}
        {screen === 'review' && (
          <ReviewScreen
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
      </div>
    </div>
  );
}
