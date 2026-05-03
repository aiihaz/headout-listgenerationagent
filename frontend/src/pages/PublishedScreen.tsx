import { useNavigate } from 'react-router-dom';
import { Check, ExternalLink, Settings, Plus } from 'lucide-react';

export function PublishedScreen() {
  const navigate = useNavigate();
  const onDashboard = () => navigate('/dashboard');
  const onAnother = () => navigate('/new');
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="pop-in" style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', background: 'var(--green-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', border: '3px solid var(--green)',
        }}>
          <Check size={36} color="var(--green)" />
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
          Acropolis & Parthenon Tickets is live
        </h2>
        <p style={{ fontSize: 15, color: 'var(--ink60)', lineHeight: 1.6, marginBottom: 28 }}>
          Your listing has been published and is now visible to customers on Headout.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
          <a href="#" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
            border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13,
            fontWeight: 500, color: 'var(--slate)', textDecoration: 'none', transition: 'border-color 150ms',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--purps)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <ExternalLink size={14} /> View on Headout
          </a>
          <a href="#" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
            border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13,
            fontWeight: 500, color: 'var(--slate)', textDecoration: 'none', transition: 'border-color 150ms',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--purps)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <Settings size={14} /> View in admin
          </a>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onDashboard} style={{
            height: 42, padding: '0 24px', background: 'transparent',
            border: '1.5px solid var(--border)', color: 'var(--slate)',
            borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            Back to dashboard
          </button>
          <button onClick={onAnother} style={{
            height: 42, padding: '0 24px', background: 'var(--purps)', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Plus size={15} color="#fff" /> Process another listing
          </button>
        </div>
      </div>
    </div>
  );
}
