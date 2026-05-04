import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Inbox, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { ListingRow, ApiRun } from '../types';
import { runStatusToListingStatus } from '../types';

const CACHE_KEY = 'dashboard_runs_cache';

const STATUSES = ['All', 'Draft', 'Processing', 'In Review', 'Ready', 'Published', 'Failed'] as const;
type StatusFilter = typeof STATUSES[number];

function verdictFromStatus(status: ApiRun['status'], flagCount?: number | null): ListingRow['verdict'] {
  if (status === 'ready_for_publish' || status === 'published' || status === 'approved') return flagCount ? 'caveat' : 'ready';
  if (status === 'escalated_to_human' || status === 'regeneration_in_progress') return 'caveat';
  if (status === 'intake_failed' || status === 'generation_blocked') return 'review';
  return null;
}

function timeAgo(iso?: string): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function rowFromApiRun(run: ApiRun): ListingRow {
  const listingStatus = runStatusToListingStatus(run.status);
  const experienceName = run.supplier_name
    || (run.supplier_input?.split('\n')[0]?.slice(0, 60).trim())
    || run.id.slice(0, 8);
  return {
    id: run.id,
    runId: run.id,
    supplier: run.supplier_name ?? '—',
    experience: experienceName,
    city: '—',
    status: listingStatus,
    verdict: verdictFromStatus(run.status, run.flag_count),
    flags: run.flag_count ?? null,
    updated: timeAgo(run.updated_at ?? run.created_at),
    assignee: 'IH',
  };
}

function rowPillStyle(l: ListingRow): { background: string; color: string } {
  if (l.status === 'Published') return { background: 'var(--green-bg)', color: '#166534' };
  if (l.status === 'Processing') return { background: 'var(--dreamy)', color: 'var(--purps)' };
  if (l.status === 'In Review' && l.verdict === 'review') return { background: 'var(--red-bg)', color: 'var(--red)' };
  if (l.status === 'In Review' && l.verdict === 'caveat') return { background: 'var(--amber-bg)', color: '#92400E' };
  if (l.status === 'Ready') return { background: 'var(--green-bg)', color: '#166534' };
  if (l.status === 'Failed') return { background: 'var(--red-bg)', color: 'var(--red)' };
  return { background: 'var(--ink10)', color: 'var(--ink60)' };
}

export function Dashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [userInitials, setUserInitials] = useState('?');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) return;
      const fullName = user.user_metadata?.full_name as string | undefined;
      const email = user.email ?? '';
      const name = fullName || email.split('@')[0];
      const parts = name.split(/[\s._-]+/).filter(Boolean);
      setUserInitials(parts.slice(0, 2).map((p: string) => p[0].toUpperCase()).join('') || '?');
    });
  }, []);
  const [listings, setListings] = useState<ListingRow[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? (JSON.parse(cached) as ListingRow[]) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = async (showLoading = true) => {
    if (showLoading && listings.length === 0) setLoading(true);
    setError(null);
    try {
      const runs = await api.listRuns();
      const rows = runs.map(rowFromApiRun);
      setListings(rows);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(rows)); } catch {}
    } catch (e) {
      if (listings.length === 0) setError(e instanceof Error ? e.message : 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRuns(); }, []);

  const filtered = listings.filter(l =>
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
          <p style={{ fontSize: 13, color: 'var(--ink60)', marginTop: 2 }}>{listings.length} total</p>
        </div>
        <span style={{ flex: 1 }} />
        <button onClick={() => fetchRuns(false)} title="Refresh" style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <RefreshCw size={14} color={loading ? 'var(--purps)' : 'var(--ink60)'} style={{ transition: 'color 150ms', animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
        </button>
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
        <button onClick={() => navigate('/new')} style={{
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
        {loading && listings.length === 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Experience', 'Status', 'Updated', 'Assigned'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--ink60)', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '13px 16px' }}><span style={{ display: 'block', height: 13, width: `${140 + (i % 3) * 60}px`, borderRadius: 6, background: 'var(--ink10)', animation: 'shimmer 1.4s ease-in-out infinite' }} /></td>
                  <td style={{ padding: '13px 16px' }}><span style={{ display: 'block', height: 22, width: 72, borderRadius: 999, background: 'var(--ink10)', animation: 'shimmer 1.4s ease-in-out infinite' }} /></td>
                  <td style={{ padding: '13px 16px' }}><span style={{ display: 'block', height: 13, width: 56, borderRadius: 6, background: 'var(--ink10)', animation: 'shimmer 1.4s ease-in-out infinite' }} /></td>
                  <td style={{ padding: '13px 16px' }}><span style={{ display: 'block', width: 26, height: 26, borderRadius: '50%', background: 'var(--ink10)', animation: 'shimmer 1.4s ease-in-out infinite' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--red)' }}>
            <p style={{ fontWeight: 500 }}>Failed to load listings</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>{error}</p>
            <button onClick={() => fetchRuns()} style={{ marginTop: 16, padding: '8px 20px', background: 'var(--purps)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Experience', 'Status', 'Updated', 'Assigned'].map(h => (
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
                    onClick={() => navigate(`/listings/${l.runId}/${l.status === 'Processing' ? 'processing' : 'review'}`)}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 120ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 500, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.experience}</td>
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
                        {userInitials}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ink60)' }}>
            <Inbox size={40} color="var(--ink30)" style={{ display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 500 }}>{listings.length === 0 ? 'No listings yet' : 'No listings found'}</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>
              {listings.length === 0 ? 'Create your first listing to get started.' : 'Try adjusting your filters'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
