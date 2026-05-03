import { useState, useRef } from 'react';
import { Pencil, X, Check, RefreshCw, Quote, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { StatusPill } from './StatusPill';
import type { FieldData, FieldStatus } from '../types';

interface FieldComponentProps {
  field: FieldData;
  showSource?: boolean;
  onResolve?: () => void;
}

export function FieldComponent({ field, showSource = true, onResolve }: FieldComponentProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(field.options ? field.options[0] : (field.value ?? ''));
  const [savedVal, setSavedVal] = useState(field.options ? field.options[0] : (field.value ?? ''));
  const [activeTab, setActiveTab] = useState(0);
  const [edited, setEdited] = useState(false);
  const [expanded, setExpanded] = useState(field.status === 'review');
  const [resolved, setResolved] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [regenerating, setRegen] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const status: FieldStatus = resolved ? 'ready' : field.status;

  const borderColor = editing ? 'var(--purps)'
    : status === 'review' ? '#FCA5A5'
    : status === 'caveat' ? '#FCD34D'
    : 'var(--border)';

  const headerBorderColor = editing ? 'var(--dreamy)'
    : status === 'review' ? '#FCA5A5'
    : status === 'caveat' ? '#FDE68A'
    : 'var(--border)';

  const headerBg = editing ? '#FAFBFF'
    : status === 'review' ? '#FFF5F5'
    : status === 'caveat' ? '#FFFBEB'
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
    setSavedVal(val);
    setEditing(false);
    setEdited(true);
    if (status !== 'ready' && onResolve) {
      setResolved(true);
      onResolve();
    }
  };

  const handleCancel = () => { setVal(savedVal); setEditing(false); };

  const handleRegen = () => {
    setConfirmRegen(false);
    setRegen(true);
    setTimeout(() => {
      const orig = field.options ? field.options[0] : (field.value ?? '');
      setRegen(false);
      setVal(orig);
      setSavedVal(orig);
      setEdited(false);
    }, 1400);
  };

  const handleRaiseWithSupplier = () => {
    window.dispatchEvent(new CustomEvent('raiseWithSupplier'));
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
          <StatusPill status={status} tooltip={field.reason ?? field.caveat} />
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
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink60)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Source quote</p>
                {field.source ? (
                  <p style={{ fontSize: 12, color: 'var(--slate)', lineHeight: 1.5, fontStyle: 'italic' }}>{field.source}</p>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--ink60)', lineHeight: 1.5 }}>AI-generated — no direct supplier quote.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {!regenerating && (
          editing ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleCancel} style={{
                display: 'flex', alignItems: 'center', gap: 4, height: 26, padding: '0 10px',
                borderRadius: 6, border: '1px solid var(--border)', background: '#fff',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--ink60)',
              }}>
                <X size={12} /> Cancel
              </button>
              <button onClick={handleSave} style={{
                display: 'flex', alignItems: 'center', gap: 4, height: 26, padding: '0 10px',
                borderRadius: 6, border: '1px solid #86EFAC', background: 'var(--green-bg)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#166534',
              }}>
                <Check size={12} /> Save
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setEditing(true)} style={{
                display: 'flex', alignItems: 'center', gap: 4, height: 26, padding: '0 10px',
                borderRadius: 6, border: '1px solid var(--border)', background: '#fff',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--ink60)',
              }}>
                <Pencil size={12} /> Edit
              </button>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setConfirmRegen(!confirmRegen)} style={{
                  display: 'flex', alignItems: 'center', gap: 4, height: 26, padding: '0 10px',
                  borderRadius: 6, border: '1px solid var(--purps)', background: 'var(--purps)',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', color: '#fff',
                }}>
                  <RefreshCw size={12} color="#fff" /> Regenerate
                </button>
                {confirmRegen && (
                  <div className="fade-in" style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: '#fff',
                    border: '1px solid var(--border)', borderRadius: 8, padding: 12,
                    zIndex: 50, minWidth: 220, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  }}>
                    <p style={{ fontSize: 12, color: 'var(--ink60)', marginBottom: 10, lineHeight: 1.5 }}>
                      Regenerate this field? Your edits will be lost.
                    </p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={handleRegen} style={{
                        flex: 1, height: 28, background: 'var(--purps)', color: '#fff',
                        border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}>
                        <RefreshCw size={11} color="#fff" /> Regenerate
                      </button>
                      <button onClick={() => setConfirmRegen(false)} style={{
                        flex: 1, height: 28, background: 'var(--ink10)', border: 'none',
                        borderRadius: 6, fontSize: 12, cursor: 'pointer',
                      }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
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
        {regenerating ? (
          <div style={{ height: 60, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--purps)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <span style={{ fontSize: 13, color: 'var(--ink60)' }}>Regenerating…</span>
          </div>
        ) : editing ? (
          <textarea
            ref={textareaRef}
            value={val}
            onChange={e => setVal(e.target.value)}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Escape') handleCancel();
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
            }}
            style={{
              width: '100%', fontSize: 14, lineHeight: 1.6,
              border: 'none', outline: 'none', resize: 'none',
              background: 'transparent', fontFamily: 'inherit', minHeight: 60,
            }}
            rows={Math.max(2, val.split('\n').length)}
          />
        ) : (
          <p onDoubleClick={() => setEditing(true)} style={{ fontSize: 14, lineHeight: 1.6, minHeight: 40, cursor: 'default' }}>
            {val}
          </p>
        )}
      </div>

      {/* Flag detail */}
      {status !== 'ready' && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={() => setExpanded(!expanded)} style={{
            width: '100%', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink60)', fontSize: 12,
          }}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Why this needs review
          </button>
          {expanded && (
            <div className="fade-in" style={{ padding: '0 14px 14px' }}>
              {field.reason && <p style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 8 }}>{field.reason}</p>}
              {field.caveat && (
                <p style={{ fontSize: 13, color: '#92400E', marginBottom: 8, background: '#FFFBEB', padding: '6px 10px', borderRadius: 6 }}>
                  ℹ {field.caveat}
                </p>
              )}
              {field.source && <p style={{ fontSize: 12, color: 'var(--ink60)', fontStyle: 'italic', marginBottom: 10 }}>"{field.source}"</p>}
              {!resolved && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => setEditing(true)} style={{
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
