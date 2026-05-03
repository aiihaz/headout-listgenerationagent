import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';

const CHECKLIST = [
  'I have reviewed all flagged fields — all issues are resolved.',
  'I have verified pricing and SKU configuration with the supplier.',
  'I have confirmed pickup zones and meeting points with the supplier.',
];

export function PublishConfirm() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const onConfirm = () => navigate(`/runs/${runId}/published`);
  const onEdit = () => navigate(`/runs/${runId}/review`);
  const [checks, setChecks] = useState([false, false, false]);
  const allChecked = checks.every(Boolean);
  const toggle = (i: number) => setChecks(c => c.map((v, j) => j === i ? !v : v));

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
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Acropolis & Parthenon Tickets with Audio Guide</p>
            <p style={{ fontSize: 13, color: 'var(--ink60)', lineHeight: 1.5, marginBottom: 12 }}>
              Stand atop the most iconic hill in Athens and explore the Acropolis at your own pace, with a multilingual audio guide narrating every column, frieze, and myth.
            </p>
            <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--ink60)' }}>
              <span><b style={{ color: 'var(--slate)' }}>City:</b> Athens</span>
              <span><b style={{ color: 'var(--slate)' }}>Variants:</b> 2 SKUs</span>
              <span><b style={{ color: 'var(--slate)' }}>Caveats:</b> 2 notes</span>
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

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onEdit} style={{
              flex: 1, height: 44, background: 'transparent', border: '1.5px solid var(--border)',
              color: 'var(--slate)', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              Edit listing
            </button>
            <button onClick={onConfirm} disabled={!allChecked} style={{
              flex: 2, height: 44, background: allChecked ? 'var(--purps)' : 'var(--ink30)',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
              cursor: allChecked ? 'pointer' : 'not-allowed',
              transition: 'background 200ms',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Send size={15} color="#fff" /> Publish now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
