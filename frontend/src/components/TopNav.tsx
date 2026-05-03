import { useState, useRef, useEffect } from 'react';
import { Check, LogOut } from 'lucide-react';
import { signOut } from '../lib/supabase';

interface TopNavProps {
  autoSave?: boolean;
}

export function TopNav({ autoSave }: TopNavProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await signOut();
  };

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
      <div ref={ref} style={{ position: 'relative' }}>
        <span
          onClick={() => setOpen(v => !v)}
          style={{
            width: 32, height: 32, borderRadius: '50%', background: 'var(--dreamy)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'var(--purps)', cursor: 'pointer',
            outline: open ? '2px solid var(--purps)' : 'none',
            outlineOffset: 2, transition: 'outline 100ms',
          }}
        >IH</span>

        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 200, background: '#fff', borderRadius: 10,
            border: '1px solid var(--border)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            overflow: 'hidden', zIndex: 100,
          }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate)' }}>Ihaz I.</p>
              <p style={{ fontSize: 11, color: 'var(--ink60)', marginTop: 2 }}>Listing Agent</p>
            </div>
            <button
              onClick={handleLogout}
              style={{
                width: '100%', padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: 'var(--slate)', textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <LogOut size={14} color="var(--ink60)" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
