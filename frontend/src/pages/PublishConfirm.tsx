import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import { api } from '../lib/api';

const CHECKLIST = [
  'I have reviewed all flagged fields — all issues are resolved.',
  'I have verified pricing and SKU configuration with the supplier.',
  'I have confirmed pickup zones and meeting points with the supplier.',
];

export function PublishConfirm() {
  const { id: runId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const onConfirm = async () => {
    if (!runId) return;
    setPublishing(true);
    setPublishError(null);
    try {
      await api.publishRun(runId);
      // Invalidate dashboard cache so returning to the list shows Published immediately
      try { localStorage.removeItem('dashboard_runs_cache'); } catch {}
      navigate(`/listings/${runId}/published`);
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : 'Publish failed — please try again');
      setPublishing(false);
    }
  };
  const onEdit = () => navigate(`/listings/${runId}/review`);
  const [checks, setChecks] = useState([false, false, false]);
  const allChecked = checks.every(Boolean);
  const toggle = (i: number) => setChecks(c => c.map((v, j) => j === i ? !v : v));

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [variantCount, setVariantCount] = useState<number | null>(null);
  const [caveatCount, setCaveatCount] = useState<number | null>(null);

  useEffect(() => {
    if (!runId) return;
    api.getRun(runId).then(run => {
      const merged = run.artifacts?.merged_listing as Record<string, unknown> | undefined;
      const listing = (merged?.listing ?? {}) as Record<string, unknown>;
      const intake = (merged?.intake_payload ?? {}) as Record<string, unknown>;

      const titleObj = listing.title as Record<string, string> | undefined;
      setTitle(titleObj?.primary ?? run.supplier_name ?? '');

      const descObj = listing.description as Record<string, unknown> | undefined;
      const shortDesc = descObj?.short as Record<string, string> | undefined;
      setDescription(shortDesc?.primary ?? '');

      const cityVal = intake.city;
      setCity(typeof cityVal === 'string' ? cityVal : (cityVal as { name?: string } | undefined)?.name ?? '');

      const variants = intake.variants as unknown[] | undefined;
      setVariantCount(variants?.length ?? null);

      const reviewArtifact = run.artifacts?.review as Record<string, unknown> | undefined;
      const warnings = ((reviewArtifact?.review as Record<string, unknown> | undefined)?.warnings) as unknown[] | undefined;
      setCaveatCount(warnings?.length ?? null);
    }).catch(() => {});
  }, [runId]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }}>
      <div className="pop-in" style={{ width: 580, background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'var(--dreamy)', padding: '20px 28px 18px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--purps)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Almost there</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>Confirm before publishing</h2>
        </div>

        <div style={{ padding: '24px 28px' }}>
          {/* Summary */}
          <div style={{ border: '1.5px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink60)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Listing summary</p>
            {title ? (
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{title}</p>
            ) : (
              <div style={{ height: 22, width: 240, borderRadius: 6, background: 'var(--ink10)', marginBottom: 6, animation: 'shimmer 1.4s ease-in-out infinite' }} />
            )}
            {description ? (
              <p style={{ fontSize: 13, color: 'var(--ink60)', lineHeight: 1.5, marginBottom: 12 }}>{description}</p>
            ) : (
              <div style={{ height: 36, borderRadius: 6, background: 'var(--ink10)', marginBottom: 12, animation: 'shimmer 1.4s ease-in-out infinite' }} />
            )}
            <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--ink60)', flexWrap: 'wrap' }}>
              {city && <span><b style={{ color: 'var(--slate)' }}>City:</b> {city}</span>}
              {variantCount != null && <span><b style={{ color: 'var(--slate)' }}>Variants:</b> {variantCount} SKU{variantCount !== 1 ? 's' : ''}</span>}
              {caveatCount != null && caveatCount > 0 && <span><b style={{ color: 'var(--slate)' }}>Caveats:</b> {caveatCount} note{caveatCount !== 1 ? 's' : ''}</span>}
            </div>
          </div>

          {/* Checklist */}
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink60)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Pre-publish checklist</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {CHECKLIST.map((item, i) => (
              <label key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
                padding: '10px 12px', borderRadius: 8,
                border: `1.5px solid ${checks[i] ? 'var(--green)' : 'var(--border)'}`,
                background: checks[i] ? 'var(--green-bg)' : '#fff',
                transition: 'all 150ms',
              }}>
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={() => toggle(i)}
                  style={{ width: 16, height: 16, accentColor: 'var(--green)', marginTop: 1, flexShrink: 0 }}
                />
                <span style={{ fontSize: 13, lineHeight: 1.5, color: checks[i] ? '#166534' : 'var(--slate)' }}>{item}</span>
              </label>
            ))}
          </div>

          {publishError && (
            <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--red-bg)', border: '1px solid #FCA5A5', borderRadius: 8, fontSize: 13, color: '#991B1B' }}>
              {publishError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onEdit} style={{
              flex: 1, height: 44, background: 'transparent', border: '1.5px solid var(--border)',
              color: 'var(--slate)', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              Edit listing
            </button>
            <button onClick={onConfirm} disabled={!allChecked || publishing} style={{
              flex: 2, height: 44, background: allChecked && !publishing ? 'var(--purps)' : 'var(--ink30)',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
              cursor: allChecked && !publishing ? 'pointer' : 'not-allowed',
              transition: 'background 200ms',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Send size={15} color="#fff" /> {publishing ? 'Publishing…' : 'Publish now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
