import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Eye, Send, AlertTriangle, CheckCircle,
  ArrowRight, X, Check, Plus,
} from 'lucide-react';
import { FieldComponent } from '../components/FieldComponent';
import { PricingTable } from '../components/PricingTable';
import { api } from '../lib/api';
import { mapRunToReviewData } from '../lib/mapRunToReviewData';
import type { FieldData, FieldStatus, ReviewData, VariantCopy } from '../types';

const EMPTY_REVIEW_DATA: ReviewData = {
  title: { label: 'Title', value: '', status: 'ready', source: null },
  tagline: { id: 'tagline', label: 'Tagline', value: '', status: 'ready', source: null },
  descHook: { label: 'Description hook', value: '', status: 'ready', source: null },
  highlights: [],
  inclusions: [],
  exclusions: [],
  kbyg: { whatToBring: [], whatsNotAllowed: [], accessibility: { id: 'kbyg-access', label: 'Accessibility', value: '', status: 'ready', source: null }, additional: [] },
  faqs: [],
  pricing: [],
  variantsCopy: [],
  cancellation: { id: 'cancel', label: 'Cancellation policy', value: '', status: 'ready', source: null },
  seoNote: { id: 'seo', label: 'SEO tags', value: '', status: 'ready', source: null },
};

function pricingStatus(variants: ReviewData['pricing']): FieldStatus {
  if (variants.length === 0) return 'flag';
  for (const v of variants) {
    if (v.tiers.length === 0) return 'flag';
    const hasAdult = v.tiers.some(t => t.ageGroup === 'ADULT' || t.ageGroup === 'GROUP');
    if (!hasAdult) return 'flag';
    if (v.tiers.some(t => !t.isFree && t.pricePerUnit == null)) return 'flag';
  }
  return 'ready';
}

function buildFlagList(data: ReviewData) {
  const list: { label: string; reason: string; id: string }[] = [];
  const push = (f: FieldData, id: string) => {
    if (f.status === 'flag') {
      list.push({ label: f.label, reason: f.reason ?? 'Needs attention', id });
    }
  };
  push(data.title, 's-title');
  push(data.tagline, 's-tagline');
  push(data.descHook, 's-desc');
  data.highlights.forEach(h => push(h, 's-highlights'));
  data.inclusions.forEach(i => push(i, 's-inclusions'));
  data.exclusions.forEach(e => push(e, 's-exclusions'));
  data.kbyg.whatToBring.forEach(f => push(f, 's-kbyg'));
  data.kbyg.whatsNotAllowed.forEach(f => push(f, 's-kbyg'));
  push(data.kbyg.accessibility, 's-kbyg');
  data.kbyg.additional.forEach(f => push(f, 's-kbyg'));
  data.faqs.forEach(f => push(f, 's-faqs'));
  const ps = pricingStatus(data.pricing);
  if (ps === 'flag') {
    list.push({ label: 'Pricing', reason: 'Pricing data is incomplete — confirm with supplier', id: 's-pricing' });
  }
  data.variantsCopy.forEach(v => {
    push(v.tagline, 's-variants');
    push(v.description, 's-variants');
    v.keyDifferentiators.forEach(kd => push(kd, 's-variants'));
    if (v.upsellHook) push(v.upsellHook, 's-variants');
  });
  push(data.cancellation, 's-cancel');
  push(data.seoNote, 's-seo');
  return list;
}

function statusDot(s: FieldStatus) {
  return s === 'flag' ? 'var(--amber)' : 'var(--green)';
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
  const kbygFields = [
    ...data.kbyg.whatToBring, ...data.kbyg.whatsNotAllowed,
    data.kbyg.accessibility, ...data.kbyg.additional,
  ];
  const variantFields = data.variantsCopy.flatMap(v => [
    v.tagline, v.description, ...v.keyDifferentiators,
    ...(v.upsellHook ? [v.upsellHook] : []),
  ]);
  const allFields = [
    data.title, data.tagline, data.descHook,
    ...data.highlights, ...data.inclusions, ...data.exclusions,
    ...kbygFields, ...data.faqs, ...variantFields,
    data.cancellation, data.seoNote,
  ];
  const fieldFlags = allFields.filter(f => f.status === 'flag').length;
  return fieldFlags + (pricingStatus(data.pricing) === 'flag' ? 1 : 0);
}

export function ReviewScreen() {
  const { id: runId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const onPublish = () => navigate(`/listings/${runId}/publish`);
  const onBack = () => navigate('/dashboard');
  const showSourceQuotes = true;
  const [reviewData, setReviewData] = useState<ReviewData>(EMPTY_REVIEW_DATA);
  const [supplierName, setSupplierName] = useState<string>('');
  const [isPublished, setIsPublished] = useState(false);
  const [totalFlags, setTotalFlags] = useState(0);
  const [loadingRun, setLoadingRun] = useState(!!runId);
  const [resolvedSections, setResolvedSections] = useState<Record<string, number>>({});
  const [resolvedFieldIds, setResolvedFieldIds] = useState<Set<string>>(new Set());

  const ALL_SECTION_IDS = ['s-title', 's-tagline', 's-desc', 's-highlights', 's-inclusions', 's-exclusions', 's-kbyg', 's-faqs', 's-pricing', 's-variants', 's-seo', 's-cancel'];

  useEffect(() => {
    if (!runId) return;
    const saved = localStorage.getItem(`review-resolved-${runId}`);
    if (saved) { try { setResolvedSections(JSON.parse(saved)); } catch {} }
    const savedFields = localStorage.getItem(`review-resolved-fields-${runId}`);
    if (savedFields) { try { setResolvedFieldIds(new Set(JSON.parse(savedFields))); } catch {} }
  }, [runId]);

  useEffect(() => {
    if (!runId) return;
    setLoadingRun(true);
    api.getRun(runId).then(run => {
      if (run.supplier_name) setSupplierName(run.supplier_name);
      const published = run.status === 'published' || run.status === 'approved';
      setIsPublished(published);
      const merged = run.artifacts?.merged_listing as Record<string, unknown> | undefined;
      if (merged) {
        const reviewArtifact = run.artifacts?.review as Record<string, unknown> | undefined;
        const intakeArtifact = run.artifacts?.intake as Record<string, unknown> | undefined;
        const data = mapRunToReviewData({ ...merged, review: reviewArtifact?.review }, intakeArtifact);
        setReviewData(data);
        setTotalFlags(buildFlagList(data).length);
      }
      if (published) {
        const allResolved = Object.fromEntries(ALL_SECTION_IDS.map(id => [id, 99]));
        setResolvedSections(allResolved);
        if (runId) localStorage.setItem(`review-resolved-${runId}`, JSON.stringify(allResolved));
        // Field-level resolution handled by isPublished check in render
      }
    }).catch(() => {
      // Keep empty state on error
    }).finally(() => setLoadingRun(false));
  }, [runId]);

  const flagList = useMemo(() => {
    const raw = buildFlagList(reviewData);
    const skipped: Record<string, number> = {};
    return raw.filter(fl => {
      const resolved = resolvedSections[fl.id] ?? 0;
      const skippedSoFar = skipped[fl.id] ?? 0;
      if (skippedSoFar < resolved) {
        skipped[fl.id] = skippedSoFar + 1;
        return false;
      }
      return true;
    });
  }, [reviewData, resolvedSections]);

  const flagCount = flagList.length;

  const [activeSection, setActiveSection] = useState('s-title');
  const [bannerExpanded, setBannerExpanded] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierSent, setSupplierSent] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const markSectionResolved = (sectionId: string) => {
    setResolvedSections(prev => {
      const next = { ...prev, [sectionId]: (prev[sectionId] || 0) + 1 };
      if (runId) localStorage.setItem(`review-resolved-${runId}`, JSON.stringify(next));
      return next;
    });
  };

  const markFieldResolved = (fieldId: string, sectionId: string) => {
    setResolvedFieldIds(prev => {
      const next = new Set(prev);
      next.add(fieldId);
      if (runId) localStorage.setItem(`review-resolved-fields-${runId}`, JSON.stringify([...next]));
      return next;
    });
    markSectionResolved(sectionId);
  };

  const reloadRun = () => {
    if (!runId) return;
    setLoadingRun(true);
    api.getRun(runId).then(run => {
      if (run.supplier_name) setSupplierName(run.supplier_name);
      const merged = run.artifacts?.merged_listing as Record<string, unknown> | undefined;
      if (merged) {
        const reviewArtifact = run.artifacts?.review as Record<string, unknown> | undefined;
        const intakeArtifact = run.artifacts?.intake as Record<string, unknown> | undefined;
        const data = mapRunToReviewData({ ...merged, review: reviewArtifact?.review }, intakeArtifact);
        setReviewData(data);
        setTotalFlags(buildFlagList(data).length);
        setResolvedSections({});
        setResolvedFieldIds(new Set());
        if (runId) {
          localStorage.removeItem(`review-resolved-${runId}`);
          localStorage.removeItem(`review-resolved-fields-${runId}`);
        }
      }
    }).catch(() => {}).finally(() => setLoadingRun(false));
  };

  // Refresh data after a targeted regen — preserves resolved state so other fields don't reset
  const softReloadData = async () => {
    if (!runId) return;
    const run = await api.getRun(runId);
    if (run.supplier_name) setSupplierName(run.supplier_name);
    const merged = run.artifacts?.merged_listing as Record<string, unknown> | undefined;
    if (merged) {
      const reviewArtifact = run.artifacts?.review as Record<string, unknown> | undefined;
      const intakeArtifact = run.artifacts?.intake as Record<string, unknown> | undefined;
      const data = mapRunToReviewData({ ...merged, review: reviewArtifact?.review }, intakeArtifact);
      setReviewData(data);
      setTotalFlags(buildFlagList(data).length);
    }
  };

  const makeRegenerator = (sectionId: string, fixInstruction?: string) => {
    if (!runId) return undefined;
    return () => new Promise<void>((resolve, reject) => {
      api.regenerateSection(runId, sectionId, fixInstruction ?? '').then(() => {
        const pollInterval = setInterval(() => {
          api.getRunStatus(runId).then(status => {
            if (status.status === 'ready_for_publish' || status.status === 'escalated_to_human') {
              clearInterval(pollInterval);
              softReloadData().then(resolve).catch(reject);
            }
          }).catch(err => { clearInterval(pollInterval); reject(err); });
        }, 2000);
        // Safety: resolve after 3 minutes even if poll never fires
        setTimeout(() => { clearInterval(pollInterval); resolve(); }, 180_000);
      }).catch(reject);
    });
  };

  function resolvedOrActual(sectionId: string, actual: FieldStatus, resolveThreshold = 1): FieldStatus {
    return resolvedSections[sectionId] >= resolveThreshold ? 'ready' : actual;
  }

  const kbygFieldStatus = (): FieldStatus => {
    const all = [
      ...reviewData.kbyg.whatToBring, ...reviewData.kbyg.whatsNotAllowed,
      reviewData.kbyg.accessibility, ...reviewData.kbyg.additional,
    ];
    return all.find(f => f.status !== 'ready')?.status ?? 'ready';
  };
  const variantsCopyStatus = (): FieldStatus => {
    for (const v of reviewData.variantsCopy) {
      const fields: FieldData[] = [v.tagline, v.description, ...v.keyDifferentiators, ...(v.upsellHook ? [v.upsellHook] : [])];
      if (fields.some(f => f.status !== 'ready')) return 'flag';
    }
    return 'ready';
  };

  const navSections = [
    { id: 's-title', label: 'Title', status: resolvedOrActual('s-title', reviewData.title.status) },
    { id: 's-tagline', label: 'Tagline', status: resolvedOrActual('s-tagline', reviewData.tagline.status) },
    { id: 's-desc', label: 'Description', status: resolvedOrActual('s-desc', reviewData.descHook.status) },
    { id: 's-highlights', label: 'Highlights', status: resolvedOrActual('s-highlights', reviewData.highlights.find(h => h.status !== 'ready')?.status ?? 'ready') },
    { id: 's-inclusions', label: 'Inclusions', status: resolvedOrActual('s-inclusions', reviewData.inclusions.find(i => i.status !== 'ready')?.status ?? 'ready') },
    { id: 's-exclusions', label: 'Exclusions', status: resolvedOrActual('s-exclusions', reviewData.exclusions.find(e => e.status !== 'ready')?.status ?? 'ready') },
    { id: 's-kbyg', label: 'Know Before You Go', status: resolvedOrActual('s-kbyg', kbygFieldStatus()) },
    { id: 's-faqs', label: 'FAQs', status: resolvedOrActual('s-faqs', reviewData.faqs.find(f => f.status !== 'ready')?.status ?? 'ready', 2) },
    { id: 's-pricing', label: 'Pricing', status: resolvedOrActual('s-pricing', pricingStatus(reviewData.pricing)) },
    { id: 's-variants', label: 'Variants', status: resolvedOrActual('s-variants', variantsCopyStatus()) },
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

  const verdictReady = flagCount === 0 && !loadingRun;
  const experienceName = reviewData.title.options?.[0] ?? reviewData.title.value ?? 'Untitled listing';
  const progressPct = totalFlags > 0 ? Math.round(((totalFlags - flagCount) / totalFlags) * 100) : 0;

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
          fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px', borderRadius: 6,
        }}>
          <ChevronLeft size={13} color="var(--purps)" /> Listings
        </button>
        {supplierName && (<><ChevronRight size={13} color="var(--ink60)" />
        <span style={{ fontSize: 13, color: 'var(--ink60)' }}>{supplierName}</span></>)}
        <ChevronRight size={13} color="var(--ink60)" />
        <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>
          {experienceName}
        </span>
        <span style={{ flex: 1 }} />
        <button onClick={() => window.open('https://www.headout.com', '_blank')} style={{
          height: 32, padding: '0 14px', background: 'transparent', color: 'var(--purps)',
          border: '1.5px solid var(--purps)', borderRadius: 8, fontSize: 13, fontWeight: 500,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Eye size={13} color="var(--purps)" /> Preview
        </button>
        {isPublished ? (
          <span style={{
            height: 32, padding: '0 14px', background: 'var(--green-bg)', color: '#166534',
            border: '1.5px solid #86EFAC', borderRadius: 8, fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <CheckCircle size={13} color="var(--green)" /> Published
          </span>
        ) : (
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
        )}
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
              width: verdictReady ? '100%' : `${progressPct}%`,
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
              {flagCount} {flagCount !== 1 ? 'flags' : 'flag'} to resolve
              {bannerExpanded ? <X size={13} color="#92400E" /> : <ArrowRight size={13} color="#92400E" />}
            </button>
          )}
        </div>

        {!verdictReady && bannerExpanded && (
          <div className="fade-in" style={{ padding: '0 20px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {flagList.map((fl, idx) => (
              <button
                key={`${fl.id}-${idx}`}
                onClick={() => { scrollTo(fl.id); setBannerExpanded(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, background: '#fff',
                  border: '1px solid #FDE68A',
                  borderRadius: 8, padding: '8px 12px', cursor: 'pointer', textAlign: 'left', transition: 'background 120ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FFFBEB')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }} />
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
                  {supplierName || 'The supplier'} has been notified and will receive a form to submit clarifications for the {flagList.length} flagged items.
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
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>{supplierName || 'Supplier'}</h3>
                    <p style={{ fontSize: 13, color: 'var(--ink60)', marginTop: 2 }}>{experienceName}</p>
                  </div>
                  <button onClick={() => setSupplierModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink60)', padding: 4, borderRadius: 6, display: 'flex' }}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink60)', marginBottom: 2 }}>The following items need clarification from your side:</p>
                  {flagList.map((fl, i) => (
                    <div key={`${fl.id}-${i}`} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8 }}>
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

      {/* Section nav */}
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
      <div ref={mainRef} style={{ flex: 1, overflow: 'auto', padding: '20px 28px 32px' }}>
        <Section id="s-title">
          <FieldComponent field={reviewData.title} showSource={showSourceQuotes}
            initialResolved={isPublished || resolvedFieldIds.has('title')}
            onResolve={() => markFieldResolved('title', 's-title')}
            onRegenerate={makeRegenerator('listing.title', reviewData.title.reason)} />
        </Section>

        <Section id="s-tagline">
          <FieldComponent field={reviewData.tagline} showSource={showSourceQuotes}
            initialResolved={isPublished || resolvedFieldIds.has('tagline')}
            onResolve={() => markFieldResolved('tagline', 's-tagline')}
            onRegenerate={makeRegenerator('listing.tagline', reviewData.tagline.reason)} />
        </Section>

        <Section id="s-desc">
          <FieldComponent field={reviewData.descHook} showSource={showSourceQuotes}
            initialResolved={isPublished || resolvedFieldIds.has('desc')}
            onResolve={() => markFieldResolved('desc', 's-desc')}
            onRegenerate={makeRegenerator('listing.description', reviewData.descHook.reason)} />
        </Section>

        <Section id="s-highlights">
          {reviewData.highlights.map(h => (
            <FieldComponent key={h.id} field={h} showSource={showSourceQuotes}
              initialResolved={isPublished || resolvedFieldIds.has(h.id ?? '')}
              onResolve={h.status !== 'ready' ? () => markFieldResolved(h.id ?? '', 's-highlights') : undefined}
              onRegenerate={makeRegenerator('highlights', h.reason)} />
          ))}
        </Section>

        <Section id="s-inclusions">
          {reviewData.inclusions.map(h => (
            <FieldComponent key={h.id} field={h} showSource={showSourceQuotes}
              initialResolved={isPublished || resolvedFieldIds.has(h.id ?? '')}
              onResolve={h.status !== 'ready' ? () => markFieldResolved(h.id ?? '', 's-inclusions') : undefined}
              onRegenerate={makeRegenerator('inclusions', h.reason)} />
          ))}
        </Section>

        <Section id="s-exclusions">
          {reviewData.exclusions.map(h => (
            <FieldComponent key={h.id} field={h} showSource={showSourceQuotes}
              initialResolved={isPublished || resolvedFieldIds.has(h.id ?? '')}
              onResolve={h.status !== 'ready' ? () => markFieldResolved(h.id ?? '', 's-exclusions') : undefined}
              onRegenerate={makeRegenerator('exclusions', h.reason)} />
          ))}
        </Section>

        <Section id="s-kbyg">
          {reviewData.kbyg.whatToBring.map(f => (
            <FieldComponent key={f.id} field={f} showSource={showSourceQuotes}
              initialResolved={isPublished || resolvedFieldIds.has(f.id ?? '')}
              onResolve={f.status !== 'ready' ? () => markFieldResolved(f.id ?? '', 's-kbyg') : undefined}
              onRegenerate={makeRegenerator('listing.know_before_you_go.what_to_bring', f.reason)} />
          ))}
          {reviewData.kbyg.whatsNotAllowed.map(f => (
            <FieldComponent key={f.id} field={f} showSource={showSourceQuotes}
              initialResolved={isPublished || resolvedFieldIds.has(f.id ?? '')}
              onResolve={f.status !== 'ready' ? () => markFieldResolved(f.id ?? '', 's-kbyg') : undefined}
              onRegenerate={makeRegenerator('listing.know_before_you_go.whats_not_allowed', f.reason)} />
          ))}
          {reviewData.kbyg.accessibility.value && (
            <FieldComponent field={reviewData.kbyg.accessibility} showSource={showSourceQuotes}
              initialResolved={isPublished || resolvedFieldIds.has('kbyg-access')}
              onResolve={() => markFieldResolved('kbyg-access', 's-kbyg')}
              onRegenerate={makeRegenerator('listing.know_before_you_go.accessibility', reviewData.kbyg.accessibility.reason)} />
          )}
          {reviewData.kbyg.additional.map(f => (
            <FieldComponent key={f.id} field={f} showSource={showSourceQuotes}
              initialResolved={isPublished || resolvedFieldIds.has(f.id ?? '')}
              onResolve={f.status !== 'ready' ? () => markFieldResolved(f.id ?? '', 's-kbyg') : undefined}
              onRegenerate={makeRegenerator('listing.know_before_you_go.additional', f.reason)} />
          ))}
        </Section>

        <Section id="s-faqs">
          {reviewData.faqs.map(f => (
            <FieldComponent key={f.id} field={f} showSource={showSourceQuotes}
              initialResolved={isPublished || resolvedFieldIds.has(f.id ?? '')}
              onResolve={f.status !== 'ready' ? () => markFieldResolved(f.id ?? '', 's-faqs') : undefined}
              onRegenerate={makeRegenerator('faqs', f.reason)} />
          ))}
        </Section>

        <Section id="s-pricing">
          <PricingTable variants={reviewData.pricing}
            initialResolved={isPublished || resolvedSections['s-pricing'] >= 1}
            onResolve={() => markSectionResolved('s-pricing')} />
        </Section>

        <Section id="s-variants">
          {reviewData.variantsCopy.map((v: VariantCopy) => (
            <div key={v.index} style={{ marginBottom: v.index < reviewData.variantsCopy.length - 1 ? 16 : 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink60)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                Variant {v.index + 1} — {v.name}
              </p>
              <FieldComponent field={v.tagline} showSource={showSourceQuotes}
                initialResolved={isPublished || resolvedFieldIds.has(v.tagline.id ?? '')}
                onResolve={v.tagline.status !== 'ready' ? () => markFieldResolved(v.tagline.id ?? '', 's-variants') : undefined}
                onRegenerate={makeRegenerator(`variants[${v.index}].tagline`, v.tagline.reason)} />
              <FieldComponent field={v.description} showSource={showSourceQuotes}
                initialResolved={isPublished || resolvedFieldIds.has(v.description.id ?? '')}
                onResolve={v.description.status !== 'ready' ? () => markFieldResolved(v.description.id ?? '', 's-variants') : undefined}
                onRegenerate={makeRegenerator(`variants[${v.index}].description`, v.description.reason)} />
              {v.keyDifferentiators.map(kd => (
                <FieldComponent key={kd.id} field={kd} showSource={showSourceQuotes}
                  initialResolved={isPublished || resolvedFieldIds.has(kd.id ?? '')}
                  onResolve={kd.status !== 'ready' ? () => markFieldResolved(kd.id ?? '', 's-variants') : undefined}
                  onRegenerate={makeRegenerator(`variants[${v.index}].key_differentiators`, kd.reason)} />
              ))}
              {v.upsellHook && (
                <FieldComponent field={v.upsellHook} showSource={showSourceQuotes}
                  initialResolved={isPublished || resolvedFieldIds.has(v.upsellHook.id ?? '')}
                  onResolve={v.upsellHook.status !== 'ready' ? () => markFieldResolved(v.upsellHook!.id ?? '', 's-variants') : undefined}
                  onRegenerate={makeRegenerator(`variants[${v.index}].upsell_hook`, v.upsellHook.reason)} />
              )}
            </div>
          ))}
        </Section>

        <Section id="s-seo">
          <FieldComponent field={reviewData.seoNote} showSource={showSourceQuotes}
            initialResolved={isPublished || resolvedFieldIds.has('seo')}
            onResolve={() => markFieldResolved('seo', 's-seo')}
            onRegenerate={makeRegenerator('seo', reviewData.seoNote.reason)} />
        </Section>

        <Section id="s-cancel">
          <FieldComponent field={reviewData.cancellation} showSource={showSourceQuotes}
            initialResolved={isPublished || resolvedFieldIds.has('cancel')}
            onResolve={() => markFieldResolved('cancel', 's-cancel')}
            onRegenerate={makeRegenerator('cancellationPolicy', reviewData.cancellation.reason)} />
        </Section>
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
