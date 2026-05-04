import { useState } from 'react';
import type { FieldStatus } from '../types';

type StatusPillStatus = FieldStatus | 'processing' | 'published' | 'draft' | 'failed';

interface StatusPillProps {
  status: StatusPillStatus;
  tooltip?: string;
}

const STATUS_CONFIG: Record<StatusPillStatus, { dot: string; bg: string; label: string }> = {
  ready:      { dot: 'var(--green)',  bg: 'var(--green-bg)', label: 'Ready' },
  flag:       { dot: 'var(--amber)',  bg: 'var(--amber-bg)', label: 'Flagged' },
  processing: { dot: 'var(--purps)', bg: 'var(--dreamy)',    label: 'Processing' },
  published:  { dot: 'var(--green)', bg: 'var(--green-bg)', label: 'Published' },
  draft:      { dot: '#B3B3B3',      bg: 'var(--ink10)',    label: 'Draft' },
  failed:     { dot: 'var(--red)',   bg: 'var(--red-bg)',   label: 'Failed' },
};

export function StatusPill({ status, tooltip }: StatusPillProps) {
  const [show, setShow] = useState(false);
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: c.bg, borderRadius: 999, padding: '3px 8px 3px 6px',
        fontSize: 11, fontWeight: 600, color: 'var(--slate)', whiteSpace: 'nowrap',
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
        {c.label}
      </span>
      {show && tooltip && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)', background: '#1a1a1a', color: '#fff',
          fontSize: 11, padding: '5px 9px', borderRadius: 6,
          whiteSpace: 'nowrap', zIndex: 100, pointerEvents: 'none',
        }}>
          {tooltip}
        </span>
      )}
    </span>
  );
}
