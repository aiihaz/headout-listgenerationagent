import { useState, useEffect, useRef } from 'react';
import { Check, ArrowRight } from 'lucide-react';

const STAGES = [
  'Reading supplier files',
  'Extracting structured data',
  'Detecting modules',
  'Generating listing',
  'Validating',
  'Finalizing verdict',
];

const CONTEXT_LINES = [
  'Found 2 files. Starting analysis…',
  'Extracted 4,200 tokens from supplier PDF.',
  'Detected modules: itinerary, operating hours, audio guide.',
  'Generating title · description · highlights · FAQs…',
  'Checking field completeness and confidence scores…',
  'Verdict ready — 3 fields need review.',
];

interface ProcessingScreenProps {
  expName?: string;
  onDone: () => void;
  stageSpeed?: number;
  autoAdvance?: boolean;
}

export function ProcessingScreen({ expName, onDone, stageSpeed = 900, autoAdvance = true }: ProcessingScreenProps) {
  const [stage, setStage] = useState(0);
  const [contextLine, setContextLine] = useState(CONTEXT_LINES[0]);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    setStage(0);
    setContextLine(CONTEXT_LINES[0]);

    const timers = STAGES.map((_, i) =>
      setTimeout(() => {
        setStage(i + 1);
        setContextLine(CONTEXT_LINES[i]);
      }, stageSpeed * (i + 1))
    );

    const doneTimer = autoAdvance
      ? setTimeout(() => onDoneRef.current(), stageSpeed * (STAGES.length + 1) + 300)
      : null;

    return () => {
      timers.forEach(clearTimeout);
      if (doneTimer) clearTimeout(doneTimer);
    };
  }, [stageSpeed, autoAdvance]);

  const pct = Math.round((stage / STAGES.length) * 100);

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
          {expName || 'Acropolis & Parthenon Tickets with Audio Guide'}
        </p>

        {/* Stages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {STAGES.map((s, i) => {
            const done = i < stage;
            const active = i === stage && stage < STAGES.length;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                  {s}
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: !autoAdvance ? 16 : 0 }}>
          <p style={{ fontSize: 12, color: 'var(--ink60)', fontStyle: 'italic' }}>{contextLine}</p>
          <span style={{ fontSize: 12, color: 'var(--purps)', fontWeight: 600 }}>{pct}%</span>
        </div>

        {!autoAdvance && (
          <button
            onClick={() => onDoneRef.current()}
            style={{
              width: '100%', height: 38, background: 'var(--purps)', color: '#fff',
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
