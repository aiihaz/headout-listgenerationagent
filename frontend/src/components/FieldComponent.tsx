import { useState, useRef } from 'react';
import { Pencil, X, Check, Quote, ChevronDown, ChevronUp, Send, RefreshCw } from 'lucide-react';
import { StatusPill } from './StatusPill';
import type { FieldData, FieldStatus } from '../types';

interface FieldComponentProps {
  field: FieldData;
  showSource?: boolean;
  onResolve?: () => void;
  onRegenerate?: () => Promise<void>;
  initialResolved?: boolean;
}

export function FieldComponent({ field, showSource = true, onResolve, onRegenerate, initialResolved }: FieldComponentProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(field.options ? field.options[0] : (field.value ?? ''));
  const [savedVal, setSavedVal] = useState(field.options ? field.options[0] : (field.value ?? ''));
  const [activeTab, setActiveTab] = useState(0);
  const [edited, setEdited] = useState(false);
  const [expanded, setExpanded] = useState(field.status === 'flag' && !initialResolved);
  const [resolved, setResolved] = useState(initialResolved ?? false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [editStartVal, setEditStartVal] = useState('');
  const [editStartTab, setEditStartTab] = useState(0);
  const [regenerating, setRegenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDirty = editing && (val !== editStartVal || activeTab !== editStartTab);

  const status: FieldStatus = resolved ? 'ready' : field.status;

  const borderColor = editing ? 'var(--purps)'
    : status === 'flag' ? '#FDE68A'
    : 'var(--border)';

  const headerBorderColor = editing ? 'var(--dreamy)'
    : status === 'flag' ? '#FDE68A'
    : 'var(--border)';

  const headerBg = editing ? '#FAFBFF'
    : status === 'flag' ? '#FFFBEB'
    : '#FAFAFA';

  const handleTabChange = (i: number) => {
    if (edited) {
      if (!window.confirm('Switching will discard your edits. Continue?')) return;
      setEdited(false);
    }
    setActiveTab(i);
    setVal(field.options![i]);
    setSavedVal(field.options![i]);
  };

  const handleSave = () => {
    if (!isDirty) return;
    setSavedVal(val);
    setEditing(false);
    setEdited(true);
    if (status !== 'ready' && onResolve) {
      setResolved(true);
      onResolve();
    }
  };

  const handleCancel = () => { setVal(savedVal); setEditing(false); };

  const handleRaiseWithSupplier = () => {
    window.dispatchEvent(new CustomEvent('raiseWithSupplier'));
  };

  const handleRegenerate = async () => {
    if (!onRegenerate || regenerating) return;
    setRegenerating(true);
    try { await onRegenerate(); } finally { setRegenerating(false); }
  };

  return (
    <div style={{
      border: `1.5px solid ${borderColor}`, borderRadius: 10, overflow: 'hidden',
      background: '#fff', marginBottom: 10, transition: 'border-color 200ms',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 8,
        borderBottom: `1px solid ${headerBorderColor}`, background: headerBg,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 13, fontWeight: 700, color: 'var(--slate)',
            fontFamily: 'var(--font-display)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {field.label}
          </span>
          <StatusPill status={status} tooltip={field.reason} />
        </span>

        {/* Source quote */}
        {showSource && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setSourceOpen(!sourceOpen)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: sourceOpen ? 'var(--purps)' : 'var(--ink60)',
                padding: '2px 4px', borderRadius: 4,
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 11, fontWeight: 500,
              }}
              title="View source"
            >
              <Quote size={12} /> Source
            </button>
            {sourceOpen && (
              <div className="fade-in" style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)', width: 300,
                background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
                padding: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50,
              }}>
                {field.source?.kind === 'supplier' ? (
                  <>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink60)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Supplier PDF</p>
                    {field.source.quote ? (
                      <p style={{ fontSize: 12, color: 'var(--slate)', lineHeight: 1.5, fontStyle: 'italic' }}>"{field.source.quote}"</p>
                    ) : (
                      <p style={{ fontSize: 12, color: 'var(--ink60)', lineHeight: 1.5 }}>Extracted directly from supplier document.</p>
                    )}
                  </>
                ) : field.source?.kind === 'google' ? (
                  <>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink60)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Google search</p>
                    {field.source.quote && (
                      <p style={{ fontSize: 12, color: 'var(--slate)', lineHeight: 1.5, fontStyle: 'italic' }}>"{field.source.quote}"</p>
                    )}
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink60)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Source</p>
                    <p style={{ fontSize: 12, color: 'var(--ink60)', lineHeight: 1.5 }}>AI-generated — no direct supplier quote.</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Edit action */}
        {editing ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleCancel} style={{
              display: 'flex', alignItems: 'center', gap: 4, height: 26, padding: '0 10px',
              borderRadius: 6, border: '1px solid var(--border)', background: '#fff',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--ink60)',
            }}>
              <X size={12} /> Cancel
            </button>
            <button onClick={handleSave} disabled={!isDirty} style={{
              display: 'flex', alignItems: 'center', gap: 4, height: 26, padding: '0 10px',
              borderRadius: 6, border: '1px solid #86EFAC', background: 'var(--green-bg)',
              fontSize: 12, fontWeight: 600, cursor: isDirty ? 'pointer' : 'default',
              color: '#166534', opacity: isDirty ? 1 : 0.4,
            }}>
              <Check size={12} /> Save
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => { setEditStartVal(val); setEditStartTab(activeTab); setEditing(true); }} style={{
              display: 'flex', alignItems: 'center', gap: 4, height: 26, padding: '0 10px',
              borderRadius: 6, border: '1px solid var(--border)', background: '#fff',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--ink60)',
            }}>
              <Pencil size={12} /> Edit
            </button>
            {onRegenerate && (
              <button onClick={handleRegenerate} disabled={regenerating} style={{
                display: 'flex', alignItems: 'center', gap: 4, height: 26, padding: '0 10px',
                borderRadius: 6, border: 'none', background: regenerating ? 'var(--ink30)' : 'var(--purps)',
                fontSize: 12, fontWeight: 600, cursor: regenerating ? 'default' : 'pointer', color: '#fff',
              }}>
                <RefreshCw size={12} style={{ animation: regenerating ? 'spin 0.8s linear infinite' : 'none' }} />
                {regenerating ? 'Regenerating…' : 'Regenerate'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* A/B/C tabs */}
      {field.options && !edited && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: '#fff' }}>
          {field.options.map((opt, i) => (
            <button key={i} onClick={() => handleTabChange(i)} style={{
              flex: 1, padding: '8px 12px', border: 'none',
              background: activeTab === i ? 'var(--dreamy)' : 'transparent',
              color: activeTab === i ? 'var(--purps)' : 'var(--ink60)',
              fontSize: 12, fontWeight: activeTab === i ? 600 : 400,
              cursor: 'pointer', borderBottom: activeTab === i ? '2px solid var(--purps)' : '2px solid transparent',
              textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              transition: 'all 150ms',
            }}>
              <span style={{ fontWeight: 700, marginRight: 6 }}>{String.fromCharCode(65 + i)}</span>
              {opt.substring(0, 38)}{opt.length > 38 ? '…' : ''}
            </button>
          ))}
        </div>
      )}
      {field.options && edited && (
        <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--border)', background: '#fffbf5' }}>
          <button onClick={() => {
            if (window.confirm('Switching will discard your edits. Continue?')) {
              setEdited(false); setVal(savedVal);
            }
          }} style={{ fontSize: 12, color: 'var(--purps)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
            Show alternatives
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '12px 14px', position: 'relative' }}>
        {editing ? (
          <textarea
            ref={textareaRef}
            value={val}
            onChange={e => setVal(e.target.value)}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Escape') handleCancel();
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && isDirty) handleSave();
            }}
            style={{
              width: '100%', fontSize: 14, lineHeight: 1.6,
              border: 'none', outline: 'none', resize: 'none',
              background: 'transparent', fontFamily: 'inherit', minHeight: 60,
            }}
            rows={Math.max(2, val.split('\n').length)}
          />
        ) : (
          <p style={{ fontSize: 14, lineHeight: 1.6, minHeight: 40, cursor: 'default' }}>
            {val}
          </p>
        )}
      </div>

      {/* Flag detail */}
      {status === 'flag' && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={() => setExpanded(!expanded)} style={{
            width: '100%', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink60)', fontSize: 12,
          }}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Why this is flagged
          </button>
          {expanded && (
            <div className="fade-in" style={{ padding: '0 14px 14px' }}>
              {field.reason ? (
                <p style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 8 }}>{field.reason}</p>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--ink60)', marginBottom: 8, fontStyle: 'italic' }}>No additional context from the review agent.</p>
              )}
              {field.source?.kind === 'supplier' && field.source.quote && (
                <p style={{ fontSize: 12, color: 'var(--ink60)', fontStyle: 'italic', marginBottom: 10 }}>Supplier PDF: "{field.source.quote}"</p>
              )}
              {field.source?.kind === 'google' && field.source.quote && (
                <p style={{ fontSize: 12, color: 'var(--ink60)', fontStyle: 'italic', marginBottom: 10 }}>Google search: "{field.source.quote}"</p>
              )}
              {!resolved && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => { setEditStartVal(val); setEditStartTab(activeTab); setEditing(true); }} style={{
                    height: 30, padding: '0 12px', background: '#fff', color: 'var(--slate)',
                    border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <Pencil size={12} /> Update manually
                  </button>
                  <button onClick={handleRaiseWithSupplier} style={{
                    height: 30, padding: '0 12px', background: '#fff', color: 'var(--slate)',
                    border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <Send size={12} /> Raise with supplier
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
