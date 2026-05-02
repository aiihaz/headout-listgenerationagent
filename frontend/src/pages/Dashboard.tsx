import { useState } from 'react';
import { Search, Plus, Inbox } from 'lucide-react';
import type { ListingRow } from '../types';

const LISTINGS: ListingRow[] = [
  { id: 1, supplier: 'Athens Heritage Group', experience: 'Acropolis & Parthenon Tickets with Audio Guide', city: 'Athens', status: 'In Review', verdict: 'review', flags: 3, updated: '2h ago', assignee: 'IH' },
  { id: 2, supplier: 'Desert Adventures UAE', experience: 'Dubai Desert Safari with Dinner & Entertainment', city: 'Dubai', status: 'Ready', verdict: 'ready', flags: 0, updated: '4h ago', assignee: 'MK' },
  { id: 3, supplier: 'Paris Monuments SAS', experience: 'Eiffel Tower Skip-the-Line Tickets', city: 'Paris', status: 'Processing', verdict: null, flags: null, updated: '12m ago', assignee: 'IH' },
  { id: 4, supplier: 'Colosseum Tours SpA', experience: 'Colosseum & Roman Forum Guided Entry', city: 'Rome', status: 'In Review', verdict: 'caveat', flags: 1, updated: '1d ago', assignee: 'AJ' },
  { id: 5, supplier: 'Barcelona Sights S.L.', experience: 'Sagrada Família Fast-Track Tickets', city: 'Barcelona', status: 'Published', verdict: 'ready', flags: 0, updated: '3d ago', assignee: 'MK' },
  { id: 6, supplier: 'Kyoto Experiences Ltd.', experience: 'Arashiyama Bamboo Grove & Temple Tour', city: 'Kyoto', status: 'Draft', verdict: null, flags: null, updated: '5d ago', assignee: 'IH' },
  { id: 7, supplier: 'NYC Summit LLC', experience: 'One World Observatory — Timed Entry Tickets', city: 'New York', status: 'In Review', verdict: 'review', flags: 7, updated: '6h ago', assignee: 'AJ' },
];

const STATUSES = ['All', 'Draft', 'Processing', 'In Review', 'Ready', 'Published'] as const;

type StatusFilter = typeof STATUSES[number];

function rowPillStyle(l: ListingRow): { background: string; color: string } {
  if (l.status === 'Published') return { background: 'var(--green-bg)', color: '#166534' };
  if (l.status === 'Processing') return { background: 'var(--dreamy)', color: 'var(--purps)' };
  if (l.status === 'In Review' && l.verdict === 'review') return { background: 'var(--red-bg)', color: 'var(--red)' };
  if (l.status === 'In Review' && l.verdict === 'caveat') return { background: 'var(--amber-bg)', color: '#92400E' };
  if (l.status === 'Ready') return { background: 'var(--green-bg)', color: '#166534' };
  if (l.status === 'Failed') return { background: 'var(--red-bg)', color: 'var(--red)' };
  return { background: 'var(--ink10)', color: 'var(--ink60)' };
}

interface DashboardProps {
  onNew: () => void;
  onOpen: (l: ListingRow) => void;
}

export function Dashboard({ onNew, onOpen }: DashboardProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  const filtered = LISTINGS.filter(l =>
    (statusFilter === 'All' || l.status === statusFilter) &&
    (l.experience.toLowerCase().includes(search.toLowerCase()) ||
     l.supplier.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding: '20px 32px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>Listings</h1>
          <p style={{ fontSize: 13, color: 'var(--ink60)', marginTop: 2 }}>{LISTINGS.length} total</p>
        </div>
        <span style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} color="var(--ink60)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search listings…"
            style={{
              height: 36, paddingLeft: 32, paddingRight: 12,
              border: '1.5px solid var(--border)', borderRadius: 8,
              fontSize: 13, width: 240, outline: 'none', background: '#fff',
            }}
          />
        </div>
        <button onClick={onNew} style={{
          height: 36, padding: '0 16px', background: 'var(--purps)', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}>
          <Plus size={15} color="#fff" /> New listing
        </button>
      </div>

      {/* Filters */}
      <div style={{ padding: '14px 32px 0', display: 'flex', gap: 8 }}>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            height: 30, padding: '0 12px', borderRadius: 999,
            border: `1.5px solid ${statusFilter === s ? 'var(--slate)' : 'var(--border)'}`,
            background: statusFilter === s ? 'var(--slate)' : '#fff',
            color: statusFilter === s ? '#fff' : 'var(--slate)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 150ms',
          }}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 32px 32px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Supplier', 'Experience', 'City', 'Status', 'Updated', 'Assigned'].map(h => (
                <th key={h} style={{
                  padding: '11px 16px', textAlign: 'left', fontSize: 11,
                  fontWeight: 600, color: 'var(--ink60)', letterSpacing: '0.06em',
                  textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((l, i) => {
              const pill = rowPillStyle(l);
              return (
                <tr
                  key={l.id}
                  onClick={() => onOpen(l)}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 120ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--ink60)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.supplier}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 500, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.experience}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--ink60)' }}>{l.city}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 12, fontWeight: 500, padding: '3px 8px', borderRadius: 999,
                      ...pill,
                    }}>
                      {l.status === 'Processing' && (
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--purps)', flexShrink: 0, animation: 'pulse 1.2s ease-in-out infinite' }} />
                      )}
                      {l.status}
                      {l.verdict === 'review' && l.flags != null && l.flags > 0 && (
                        <span style={{ fontWeight: 700 }}>· {l.flags} flag{l.flags !== 1 ? 's' : ''}</span>
                      )}
                      {l.verdict === 'caveat' && l.flags != null && l.flags > 0 && (
                        <span style={{ fontWeight: 700 }}>· {l.flags} caveat{l.flags !== 1 ? 's' : ''}</span>
                      )}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--ink60)' }}>{l.updated}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: '50%', background: 'var(--dreamy)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: 'var(--purps)',
                    }}>
                      {l.assignee}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ink60)' }}>
            <Inbox size={40} color="var(--ink30)" style={{ display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 500 }}>No listings found</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
