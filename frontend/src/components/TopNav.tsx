import { Check } from 'lucide-react';

interface TopNavProps {
  autoSave?: boolean;
}

export function TopNav({ autoSave }: TopNavProps) {
  return (
    <header style={{
      height: 52, background: '#fff', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
      flexShrink: 0, zIndex: 50,
    }}>
      <img src="/logo.svg" alt="Headout" style={{ height: 22 }} />
      <span style={{ width: 1, height: 20, background: 'var(--border)' }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink60)' }}>Listing Agent</span>
      <span style={{ flex: 1 }} />
      {autoSave && (
        <span style={{ fontSize: 12, color: 'var(--ink60)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Check size={13} color="var(--green)" /> Saved
        </span>
      )}
      <span style={{
        width: 32, height: 32, borderRadius: '50%', background: 'var(--dreamy)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: 'var(--purps)', cursor: 'pointer',
      }}>IH</span>
    </header>
  );
}
