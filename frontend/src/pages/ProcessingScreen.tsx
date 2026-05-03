import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Check, ArrowRight, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { TERMINAL_OK, TERMINAL_FAIL, type RunStatus } from '../types';

const STAGES: { label: string; statuses: RunStatus[] }[] = [
  { label: 'Reading supplier files', statuses: ['pending', 'duplicate_check'] },
  { label: 'Extracting structured data', statuses: ['intake_in_progress'] },
  { label: 'Researching search landscape', statuses: ['intake_complete', 'serper_in_progress', 'serper_complete', 'serper_skipped'] },
  { label: 'Generating listing', statuses: ['generation_in_progress', 'generation_complete'] },
  { label: 'Validating', statuses: ['review_in_progress', 'regeneration_in_progress'] },
  { label: 'Finalising verdict', statuses: ['ready_for_publish'] },
];

function statusToStage(status: RunStatus): number {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (STAGES[i].statuses.includes(status)) return i;
  }
  if (TERMINAL_OK.includes(status)) return STAGES.length;
  return 0;
}

function statusToContextLine(status: RunStatus, error?: string | null): string {
  if (error) return `Error: ${error}`;
  const map: Partial<Record<RunStatus, string>> = {
    pending: 'Queued for processing…',
    duplicate_check: 'Checking for duplicate listings…',
    intake_in_progress: 'Extracting fields from supplier data…',
    intake_complete: 'Structured intake complete. Researching search landscape…',
    serper_in_progress: 'Searching SERP for FAQs and competitor patterns…',
    serper_complete: 'Search research done. Preparing to generate copy…',
    serper_skipped: 'Search research skipped — continuing with intake data.',
    generation_in_progress: 'Generating title · description · highlights · FAQs…',
    generation_complete: 'Copy generated. Running quality review…',
    review_in_progress: 'Checking field completeness and voice compliance…',
    regeneration_in_progress: 'Regenerating flagged fields…',
    ready_for_publish: 'Verdict ready — proceed to review.',
    intake_failed: 'Intake failed. Please check your input and try again.',
    generation_blocked: 'Generation blocked. Pipeline could not complete.',
    escalated_to_human: 'Escalated — a human review is required.',
  };
  return map[status] ?? 'Processing…';
}

export function ProcessingScreen() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { state } = useLocation();
  const expName: string | undefined = (state as { expName?: string } | null)?.expName;

  const [stage, setStage] = useState(0);
  const [contextLine, setContextLine] = useState('Queued for processing…');
  const [failed, setFailed] = useState(false);
  const [failMessage, setFailMessage] = useState('');
  const onDoneRef = useRef(() => navigate(`/listings/${runId}/review`));
  const onErrorRef = useRef(() => navigate('/dashboard'));
  useEffect(() => {
    onDoneRef.current = () => navigate(`/listings/${runId}/review`);
    onErrorRef.current = () => navigate('/dashboard');
  }, [runId]);

  useEffect(() => {
    if (!runId) {
      // No real run — demo mode: animate through stages
      setStage(0);
      const timers = STAGES.map((_, i) =>
        setTimeout(() => setStage(i + 1), 900 * (i + 1))
      );
      const doneTimer = setTimeout(() => onDoneRef.current(), 900 * (STAGES.length + 1) + 300);
      return () => { timers.forEach(clearTimeout); clearTimeout(doneTimer); };
    }

    let cancelled = false;
    const poll = async () => {
      while (!cancelled) {
        try {
          const run = await api.getRun(runId);
          const status = run.status as RunStatus;
          const s = statusToStage(status);
          setStage(s);
          setContextLine(statusToContextLine(status, run.error_message));

          if (TERMINAL_OK.includes(status)) {
            if (!cancelled) onDoneRef.current();
            return;
          }
          if (TERMINAL_FAIL.includes(status)) {
            setFailed(true);
            setFailMessage(run.error_message ?? status);
            return;
          }
        } catch {
          // transient network error — keep polling
        }
        await new Promise(r => setTimeout(r, 2500));
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [runId]);

  const pct = Math.round((stage / STAGES.length) * 100);

  if (failed) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="fade-in" style={{
          width: 520, padding: 40, background: '#fff',
          borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.09)', textAlign: 'center',
        }}>
          <AlertTriangle size={40} color="var(--red)" style={{ display: 'block', margin: '0 auto 16px' }} />
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Pipeline failed</p>
          <p style={{ fontSize: 13, color: 'var(--ink60)', marginBottom: 24 }}>{failMessage}</p>
          <button onClick={() => onErrorRef.current()} style={{
            height: 38, padding: '0 24px', background: 'var(--purps)', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="fade-in" style={{
        width: 520, padding: 40, background: '#fff',
        borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.09)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span className="pulse-dot" />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Processing listing</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink60)', marginBottom: 24 }}>
          {expName || 'New listing'}
        </p>

        {/* Stages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {STAGES.map((s, i) => {
            const done = i < stage;
            const active = i === stage && stage < STAGES.length;
            return (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  border: done ? 'none' : active ? '2px solid var(--purps)' : '2px solid var(--border)',
                  background: done ? 'var(--green)' : active ? 'var(--dreamy)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 300ms',
                }}>
                  {done
                    ? <Check size={12} color="#fff" />
                    : active
                      ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--purps)', animation: 'pulse 1s ease-in-out infinite' }} />
                      : null}
                </span>
                <span style={{
                  fontSize: 13, transition: 'all 200ms',
                  fontWeight: active ? 600 : 400,
                  color: done ? 'var(--slate)' : active ? 'var(--purps)' : 'var(--ink30)',
                }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 999, marginBottom: 10, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`, background: 'var(--purps)',
            borderRadius: 999, transition: 'width 700ms ease-in-out',
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--ink60)', fontStyle: 'italic' }}>{contextLine}</p>
          <span style={{ fontSize: 12, color: 'var(--purps)', fontWeight: 600 }}>{pct}%</span>
        </div>

        {stage >= STAGES.length && (
          <button
            onClick={() => onDoneRef.current()}
            style={{
              marginTop: 16, width: '100%', height: 38, background: 'var(--purps)', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <ArrowRight size={14} color="#fff" /> Continue to review
          </button>
        )}
      </div>
    </div>
  );
}
