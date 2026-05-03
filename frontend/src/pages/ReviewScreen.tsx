import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Eye, Send, AlertTriangle, CheckCircle,
  ArrowRight, X, Check, Plus, FileText, ExternalLink,
} from 'lucide-react';
import { FieldComponent } from '../components/FieldComponent';
import { api } from '../lib/api';
import { mapRunToReviewData } from '../lib/mapRunToReviewData';
import type { FieldData, FieldStatus, ReviewData } from '../types';

const REVIEW_DATA = {
  title: {
    label: 'Title',
    options: [
      'Acropolis & Parthenon Tickets with Audio Guide',
      'Skip-the-Line Acropolis Tickets + Multilingual Audio Tour',
      'Athens Acropolis: Fast-Track Entry & Self-Guided Audio Guide',
    ],
    status: 'ready' as FieldStatus,
    source: 'Supplier PDF p.1: "Tickets include multilingual audio guide for self-paced exploration of the Acropolis and Parthenon."',
  } satisfies FieldData,

  descHook: {
    label: 'Description hook',
    options: [
      'Stand atop the most iconic hill in Athens and explore the Acropolis at your own pace, with a multilingual audio guide narrating every column, frieze, and myth — no tour group required.',
      'Skip the queues and explore the Acropolis on your terms. Your ticket includes fast-track access and a multilingual audio guide covering the Parthenon, Erechtheion, and Theatre of Dionysus.',
      "The Acropolis needs no introduction. Your ticket gets you inside — and your audio guide tells you everything the stones can't.",
    ],
    status: 'caveat' as FieldStatus,
    caveat: 'Operating hours vary seasonally — confirm current schedule with supplier.',
    source: 'Supplier PDF p.2: "Open daily except major public holidays. Summer hours extended to 8pm."',
  } satisfies FieldData,

  highlights: [
    { id: 'h1', label: 'Highlight 1', value: 'Fast-track entry — skip the general admission queue', status: 'ready' as FieldStatus, source: 'Supplier PDF p.3' },
    { id: 'h2', label: 'Highlight 2', value: 'Multilingual audio guide available in 32 languages', status: 'ready' as FieldStatus, source: 'Supplier PDF p.3' },
    { id: 'h3', label: 'Highlight 3', value: 'Explore at your own pace — no fixed group schedule', status: 'ready' as FieldStatus, source: 'Supplier PDF p.3' },
    { id: 'h4', label: 'Highlight 4', value: 'Includes access to the Parthenon, Erechtheion, and Theatre of Dionysus', status: 'caveat' as FieldStatus, caveat: 'Theatre of Dionysus access may be restricted during maintenance.', source: 'Supplier PDF p.4' },
  ] satisfies FieldData[],

  inclusions: [
    { id: 'i1', label: 'Inclusion 1', value: 'Timed entry ticket to the Acropolis site', status: 'ready' as FieldStatus, source: 'Supplier PDF p.5' },
    { id: 'i2', label: 'Inclusion 2', value: 'Multilingual audio guide (app-based, QR code delivery)', status: 'ready' as FieldStatus, source: 'Supplier PDF p.5' },
    { id: 'i3', label: 'Inclusion 3', value: 'Free cancellation up to 24 hours before visit', status: 'review' as FieldStatus, reason: 'Cancellation window not confirmed in supplier documents.', source: null },
  ] satisfies FieldData[],

  exclusions: [
    { id: 'ex1', label: 'Exclusion 1', value: 'Acropolis Museum entry (separate ticket required)', status: 'ready' as FieldStatus, source: 'Supplier PDF p.5' },
    { id: 'ex2', label: 'Exclusion 2', value: 'Guided tour with live guide', status: 'ready' as FieldStatus, source: 'Supplier PDF p.5' },
  ] satisfies FieldData[],

  faqs: [
    { id: 'f1', label: 'FAQ 1 — Question', value: 'Do I need to print my ticket?', status: 'ready' as FieldStatus, source: 'Supplier FAQ doc' },
    { id: 'f2', label: 'FAQ 1 — Answer', value: 'No — your ticket is delivered via QR code to your email. Show it on your phone at the entrance.', status: 'ready' as FieldStatus, source: 'Supplier FAQ doc' },
    { id: 'f3', label: 'FAQ 2 — Question', value: 'Can I enter at any time?', status: 'review' as FieldStatus, reason: 'Supplier data is ambiguous — two documents give different entry policies.', source: 'Conflict: PDF p.2 says "open entry with timed ticket", p.6 says "entry every 30 minutes".' },
    { id: 'f4', label: 'FAQ 2 — Answer', value: 'Your ticket is valid for a specific time window. Entry is available every 30 minutes within your booked slot.', status: 'review' as FieldStatus, reason: 'Depends on resolution of entry policy conflict above.', source: null },
  ] satisfies FieldData[],

  cancellation: {
    id: 'cancel1', label: 'Cancellation policy',
    value: 'Free cancellation up to 24 hours before the experience. No refund for cancellations made within 24 hours of the start time.',
    status: 'ready' as FieldStatus,
    source: 'Supplier PDF p.6: "Full refund if cancelled 24h before. No refund within 24h of start."',
  } satisfies FieldData,

  seoNote: {
    id: 'seo1', label: 'SEO tags',
    value: 'Acropolis tickets, Athens landmarks, Parthenon entry, Skip the line Athens, Audio guide Athens, Greece attractions, Athens sightseeing',
    status: 'ready' as FieldStatus,
    source: null,
  } satisfies FieldData,
};

const TOTAL_FLAGS = 5;

const FLAG_LIST = [
  { label: 'Description hook', reason: 'Operating hours vary seasonally — confirm current schedule with supplier.', id: 's-desc', type: 'caveat' },
  { label: 'Highlight 4', reason: 'Theatre of Dionysus access may be restricted during maintenance.', id: 's-highlights', type: 'caveat' },
  { label: 'Inclusion 3', reason: 'Cancellation window not confirmed in supplier documents.', id: 's-inclusions', type: 'review' },
  { label: 'FAQ 2 — Question', reason: 'Supplier data is ambiguous — two documents give different entry policies.', id: 's-faqs', type: 'review' },
  { label: 'FAQ 2 — Answer', reason: 'Depends on resolution of entry policy conflict above.', id: 's-faqs', type: 'review' },
];

function statusDot(s: FieldStatus) {
  return s === 'review' ? 'var(--red)' : s === 'caveat' ? 'var(--amber)' : 'var(--green)';
}

interface SupplierMessageFieldProps { }

function SupplierMessageField(_: SupplierMessageFieldProps) {
  const [msg, setMsg] = useState('');
  return (
    <textarea
      value={msg}
      onChange={e => setMsg(e.target.value)}
      placeholder="e.g. Please confirm the exact cancellation policy and clarify whether entry is timed or open…"
      style={{
        width: '100%', height: 80, border: '1.5px solid var(--border)', borderRadius: 8,
        padding: '10px 12px', fontSize: 13, resize: 'none', outline: 'none',
        lineHeight: 1.6, fontFamily: 'inherit', transition: 'border-color 150ms',
      }}
      onFocus={e => (e.target.style.borderColor = 'var(--purps)')}
      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
    />
  );
}

function countFlags(data: ReviewData): number {
  const allFields = [
    data.title, data.descHook, ...data.highlights, ...data.inclusions,
    ...data.exclusions, ...data.faqs, data.cancellation, data.seoNote,
  ];
  return allFields.filter(f => f.status === 'review' || f.status === 'caveat').length;
}

export function ReviewScreen() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const onPublish = () => navigate(`/listings/${runId}/publish`);
  const onBack = () => navigate('/dashboard');
  const showSourceQuotes = true;
  const [reviewData, setReviewData] = useState<ReviewData>(
    // cast: REVIEW_DATA uses satisfies which doesn't widen to ReviewData — use mock directly
    {
      title: REVIEW_DATA.title,
      descHook: REVIEW_DATA.descHook,
      highlights: REVIEW_DATA.highlights,
      inclusions: REVIEW_DATA.inclusions,
      exclusions: REVIEW_DATA.exclusions,
      faqs: REVIEW_DATA.faqs,
      cancellation: REVIEW_DATA.cancellation,
      seoNote: REVIEW_DATA.seoNote,
    } satisfies ReviewData
  );
  const [flags, setFlags] = useState(TOTAL_FLAGS);
  const [loadingRun, setLoadingRun] = useState(!!runId);
  const [resolvedSections, setResolvedSections] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!runId) return;
    setLoadingRun(true);
    api.getRun(runId).then(run => {
      const merged = run.artifacts?.merged_listing as Record<string, unknown> | undefined;
      if (merged) {
        // Attach review blockers/warnings from review artifact if present
        const reviewArtifact = run.artifacts?.review as Record<string, unknown> | undefined;
        const data = mapRunToReviewData({ ...merged, review: reviewArtifact?.review });
        setReviewData(data);
        setFlags(countFlags(data));
      }
    }).catch(() => {
      // Keep mock data on error — screen still usable
    }).finally(() => setLoadingRun(false));
  }, [runId]);
  const [activeSection, setActiveSection] = useState('s-title');
  const [bannerExpanded, setBannerExpanded] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierSent, setSupplierSent] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const markSectionResolved = (sectionId: string) => {
    setFlags(f => Math.max(0, f - 1));
    setResolvedSections(prev => ({ ...prev, [sectionId]: (prev[sectionId] || 0) + 1 }));
  };

  function resolvedOrActual(sectionId: string, actual: FieldStatus, resolveThreshold = 1): FieldStatus {
    return resolvedSections[sectionId] >= resolveThreshold ? 'ready' : actual;
  }

  const navSections = [
    { id: 's-title', label: 'Title', status: resolvedOrActual('s-title', reviewData.title.status) },
    { id: 's-desc', label: 'Description', status: resolvedOrActual('s-desc', reviewData.descHook.status) },
    { id: 's-highlights', label: 'Highlights', status: resolvedOrActual('s-highlights', reviewData.highlights.find(h => h.status !== 'ready')?.status ?? 'ready') },
    { id: 's-inclusions', label: 'Inclusions', status: resolvedOrActual('s-inclusions', reviewData.inclusions.find(i => i.status !== 'ready')?.status ?? 'ready') },
    { id: 's-exclusions', label: 'Exclusions', status: resolvedOrActual('s-exclusions', reviewData.exclusions.find(e => e.status !== 'ready')?.status ?? 'ready') },
    { id: 's-module-hours', label: 'Operating hours', status: 'ready' as FieldStatus },
    { id: 's-faqs', label: 'FAQs', status: resolvedOrActual('s-faqs', reviewData.faqs.find(f => f.status !== 'ready')?.status ?? 'ready', 2) },
    { id: 's-seo', label: 'SEO tags', status: resolvedOrActual('s-seo', reviewData.seoNote.status) },
    { id: 's-cancel', label: 'Cancellation', status: resolvedOrActual('s-cancel', reviewData.cancellation.status) },
  ];

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el && mainRef.current) {
      mainRef.current.scrollTop = el.offsetTop - 56;
      setActiveSection(id);
    }
  };

  useEffect(() => {
    const container = mainRef.current;
    if (!container) return;
    const onScroll = () => {
      const containerTop = container.scrollTop + 64;
      let current = navSections[0].id;
      for (const s of navSections) {
        const el = document.getElementById(s.id);
        if (el && el.offsetTop <= containerTop) current = s.id;
      }
      setActiveSection(current);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = () => { setSupplierModalOpen(true); setSupplierSent(false); };
    window.addEventListener('raiseWithSupplier', handler);
    return () => window.removeEventListener('raiseWithSupplier', handler);
  }, []);

  const verdictReady = flags === 0;

  if (loadingRun) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink60)', fontSize: 14 }}>
        Loading listing…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{
        height: 44, borderBottom: '1px solid var(--border)', background: '#fff',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: 'var(--purps)', cursor: 'pointer',
          fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', borderRadius: 6,
        }}>
          <ChevronLeft size={14} color="var(--purps)" /> Listings
        </button>
        <ChevronRight size={13} color="var(--ink60)" />
        <span style={{ fontSize: 13, color: 'var(--ink60)' }}>Athens Heritage Group</span>
        <ChevronRight size={13} color="var(--ink60)" />
        <span style={{ fontSize: 13, fontWeight: 500 }}>Acropolis & Parthenon Tickets with Audio Guide</span>
        <span style={{ flex: 1 }} />
        <button style={{
          height: 32, padding: '0 14px', background: 'transparent', color: 'var(--purps)',
          border: '1.5px solid var(--purps)', borderRadius: 8, fontSize: 13, fontWeight: 500,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Eye size={13} color="var(--purps)" /> Preview
        </button>
        <button
          onClick={() => verdictReady ? onPublish() : undefined}
          disabled={!verdictReady}
          title={!verdictReady ? 'Resolve all flags to unlock' : ''}
          style={{
            height: 32, padding: '0 16px',
            background: verdictReady ? 'var(--purps)' : 'var(--ink30)',
            color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: verdictReady ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', gap: 6, transition: 'background 200ms',
          }}
        >
          <Send size={13} color="#fff" /> Publish
        </button>
      </div>

      {/* Verdict banner */}
      <div style={{
        background: verdictReady ? 'var(--green-bg)' : '#FFFBEB',
        borderBottom: `1px solid ${verdictReady ? '#86EFAC' : '#FDE68A'}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px' }}>
          <div style={{ flex: 1, height: 5, background: verdictReady ? '#86EFAC' : '#FDE68A', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: verdictReady ? '100%' : `${Math.round(((TOTAL_FLAGS - flags) / TOTAL_FLAGS) * 100)}%`,
              background: verdictReady ? 'var(--green)' : 'var(--amber)',
              borderRadius: 999, transition: 'width 400ms ease-out',
            }} />
          </div>
          {verdictReady ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#166534', whiteSpace: 'nowrap' }}>
              <CheckCircle size={14} color="var(--green)" /> Ready to publish
            </span>
          ) : (
            <button
              onClick={() => setBannerExpanded(!bannerExpanded)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#92400E', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', padding: 0 }}
            >
              <AlertTriangle size={14} color="var(--amber)" />
              {flags} {flags !== 1 ? 'issues' : 'issue'} to resolve
              {bannerExpanded ? <X size={13} color="#92400E" /> : <ArrowRight size={13} color="#92400E" />}
            </button>
          )}
        </div>

        {!verdictReady && bannerExpanded && (
          <div className="fade-in" style={{ padding: '0 20px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {FLAG_LIST.map(fl => (
              <button
                key={fl.label}
                onClick={() => { scrollTo(fl.id); setBannerExpanded(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, background: '#fff',
                  border: `1px solid ${fl.type === 'review' ? '#FCA5A5' : '#FDE68A'}`,
                  borderRadius: 8, padding: '8px 12px', cursor: 'pointer', textAlign: 'left', transition: 'background 120ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = fl.type === 'review' ? '#FFF5F5' : '#FFFBEB')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: fl.type === 'review' ? 'var(--red)' : 'var(--amber)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)', minWidth: 120 }}>{fl.label}</span>
                <span style={{ fontSize: 12, color: 'var(--ink60)', flex: 1 }}>{fl.reason}</span>
                <ArrowRight size={13} color="var(--ink60)" style={{ flexShrink: 0 }} />
              </button>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                onClick={() => setSupplierModalOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px',
                  background: '#fff', color: 'var(--slate)', border: '1px solid var(--border)',
                  borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                }}
              >
                <Send size={12} /> Raise with supplier
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Supplier modal */}
      {supplierModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) { setSupplierModalOpen(false); setSupplierSent(false); } }}
        >
          <div className="pop-in" style={{ width: 560, background: '#fff', borderRadius: 16, boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}>
            {supplierSent ? (
              <div style={{ padding: '48px 32px', textAlign: 'center' }} className="pop-in">
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', background: 'var(--green-bg)',
                  border: '3px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                }}>
                  <Check size={30} color="var(--green)" />
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Request sent</h3>
                <p style={{ fontSize: 14, color: 'var(--ink60)', lineHeight: 1.6, marginBottom: 8 }}>
                  Athens Heritage Group has been notified and will receive a form to submit clarifications for the {FLAG_LIST.length} flagged items.
                </p>
                <p style={{ fontSize: 12, color: 'var(--ink30)', marginBottom: 28 }}>You'll be notified when they respond.</p>
                <button onClick={() => { setSupplierModalOpen(false); setSupplierSent(false); }} style={{
                  height: 38, padding: '0 24px', background: 'var(--purps)', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink60)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Supplier clarification request</p>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>Athens Heritage Group</h3>
                    <p style={{ fontSize: 13, color: 'var(--ink60)', marginTop: 2 }}>Acropolis & Parthenon Tickets with Audio Guide</p>
                  </div>
                  <button onClick={() => setSupplierModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink60)', padding: 4, borderRadius: 6, display: 'flex' }}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink60)', marginBottom: 2 }}>The following items need clarification from your side:</p>
                  {FLAG_LIST.map((fl, i) => (
                    <div key={fl.label} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate)' }}>{fl.label}</p>
                        <p style={{ fontSize: 12, color: 'var(--ink60)', marginTop: 2, lineHeight: 1.5 }}>{fl.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink60)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Additional message <span style={{ color: 'var(--ink30)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>Optional</span>
                  </label>
                  <SupplierMessageField />
                </div>

                <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 12, color: 'var(--ink60)' }}>Supplier will receive a form link via email.</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setSupplierModalOpen(false)} style={{ height: 36, padding: '0 16px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--slate)' }}>Cancel</button>
                    <button onClick={() => setSupplierSent(true)} style={{ height: 36, padding: '0 16px', background: 'var(--purps)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Send size={13} color="#fff" /> Send
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Section nav — horizontal pill tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '0 20px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 0, flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {navSections.map(s => {
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '8px 12px', borderRadius: 0, border: 'none',
                  borderBottom: active ? '2px solid var(--purps)' : '2px solid transparent',
                  background: 'transparent',
                  color: active ? 'var(--purps)' : 'var(--ink60)',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 150ms',
                  flexShrink: 0, marginBottom: -1,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusDot(s.status), flexShrink: 0 }} />
                {s.label}
              </button>
            );
          })}
        </div>
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 12px',
          border: 'none', borderBottom: '2px solid transparent', background: 'transparent',
          color: 'var(--ink60)', fontSize: 13, fontWeight: 400, cursor: 'pointer',
          whiteSpace: 'nowrap', flexShrink: 0, marginBottom: -1,
        }}>
          <Plus size={13} /> Add module
        </button>
      </div>

      {/* Main column */}
      <div ref={mainRef} style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
        <Section id="s-title">
          <FieldComponent field={reviewData.title} showSource={showSourceQuotes} />
        </Section>

        <Section id="s-desc">
          <FieldComponent field={reviewData.descHook} showSource={showSourceQuotes} onResolve={() => markSectionResolved('s-desc')} />
        </Section>

        <Section id="s-highlights">
          {reviewData.highlights.map(h => (
            <FieldComponent key={h.id} field={h} showSource={showSourceQuotes}
              onResolve={h.status === 'caveat' ? () => markSectionResolved('s-highlights') : undefined} />
          ))}
        </Section>

        <Section id="s-inclusions">
          {reviewData.inclusions.map(h => (
            <FieldComponent key={h.id} field={h} showSource={showSourceQuotes}
              onResolve={h.status === 'review' ? () => markSectionResolved('s-inclusions') : undefined} />
          ))}
        </Section>

        <Section id="s-exclusions">
          {reviewData.exclusions.map(h => (
            <FieldComponent key={h.id} field={h} showSource={showSourceQuotes} />
          ))}
        </Section>

        {/* Operating hours module */}
        <Section id="s-module-hours">
          <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--slate)' }}>Operating hours</span>
              <span style={{ fontSize: 11, background: 'var(--green-bg)', color: '#166534', borderRadius: 999, padding: '2px 8px', fontWeight: 600 }}>Module</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAFAFA', borderBottom: '1px solid var(--border)' }}>
                  {['Day', 'Opens', 'Closes', 'Notes'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--ink60)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Monday–Friday', '08:00', '20:00', 'Extended summer hours'],
                  ['Saturday–Sunday', '07:30', '20:00', 'Busy — expect queues'],
                  ['Public holidays', '09:00', '17:00', 'Check seasonal calendar'],
                ].map(([day, open, close, note], i, arr) => (
                  <tr key={day} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    {[day, open, close, note].map((v, j) => (
                      <td key={j} style={{ padding: '10px 14px', fontSize: 13, color: j === 3 ? 'var(--ink60)' : 'var(--slate)' }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="s-faqs">
          {reviewData.faqs.map(f => (
            <FieldComponent key={f.id} field={f} showSource={showSourceQuotes}
              onResolve={f.status === 'review' ? () => markSectionResolved('s-faqs') : undefined} />
          ))}
        </Section>

        <Section id="s-seo">
          <FieldComponent field={reviewData.seoNote} showSource={showSourceQuotes} />
        </Section>

        <Section id="s-cancel">
          <FieldComponent field={reviewData.cancellation} showSource={showSourceQuotes} />
        </Section>

        {/* Source files */}
        <div style={{ marginTop: 8, marginBottom: 32, padding: 16, background: '#fff', border: '1px solid var(--border)', borderRadius: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink60)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Source files</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[{ name: 'Supplier Spec.pdf', pages: '8 pages' }, { name: 'FAQ Document.docx', pages: '3 pages' }].map(f => (
              <button key={f.name} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'background 120ms',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--dreamy)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
              >
                <FileText size={13} color="var(--purps)" />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 500 }}>{f.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink60)' }}>{f.pages}</p>
                </div>
                <ExternalLink size={11} color="var(--ink30)" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div id={id} style={{ marginBottom: 20, scrollMarginTop: 16 }}>
      {children}
    </div>
  );
}
