import { useState, useRef, useEffect } from 'react';
import { ChevronRight, Search, X, UploadCloud, ChevronDown, ChevronUp, Check, Zap } from 'lucide-react';
import { api } from '../lib/api';
import type { ProcessData } from '../types';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  error?: boolean;
  rawFile?: File;
}

const SUPPLIERS = [
  { id: 'SUP-00412', name: 'Athens Heritage Group', city: 'Athens' },
  { id: 'SUP-00218', name: 'Desert Adventures UAE', city: 'Dubai' },
  { id: 'SUP-00531', name: 'Paris Monuments SAS', city: 'Paris' },
  { id: 'SUP-00076', name: 'Colosseum Tours SpA', city: 'Rome' },
  { id: 'SUP-00394', name: 'Barcelona Sights S.L.', city: 'Barcelona' },
  { id: 'SUP-00167', name: 'Kyoto Experiences Ltd.', city: 'Kyoto' },
  { id: 'SUP-00823', name: 'NYC Summit LLC', city: 'New York' },
  { id: 'SUP-00290', name: 'London Eye Ventures', city: 'London' },
  { id: 'SUP-00445', name: 'Sagrada Familia Tours', city: 'Barcelona' },
  { id: 'SUP-00611', name: 'Cairo Pharaoh Expeditions', city: 'Cairo' },
];

const ACCEPTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv', 'text/plain'];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

function formatSize(b: number) {
  return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;
}

interface UploadScreenProps {
  onProcess: (d: ProcessData) => void;
  onBack: () => void;
}

export function UploadScreen({ onProcess, onBack }: UploadScreenProps) {
  const [tab, setTab] = useState<'paste' | 'files'>('paste');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [supplierID, setSupplierID] = useState('');
  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [expName, setExpName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const supplierRef = useRef<HTMLDivElement>(null);

  const selectedSupplier = SUPPLIERS.find(s => s.id === supplierID);
  const filteredSuppliers = SUPPLIERS.filter(s =>
    supplierQuery.length === 0 ||
    s.name.toLowerCase().includes(supplierQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(supplierQuery.toLowerCase()) ||
    s.city.toLowerCase().includes(supplierQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) {
        setSupplierOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const canProcess = files.length > 0 || pastedText.trim().length > 0;

  const addFiles = (raw: File[]) => {
    const valid = raw.filter(f =>
      ACCEPTED_TYPES.includes(f.type) || f.name.match(/\.(pdf|docx|csv|txt)$/i)
    );
    setFiles(prev => [
      ...prev,
      ...valid.map(f => ({
        name: f.name,
        size: f.size,
        type: f.name.split('.').pop()!.toUpperCase(),
        error: f.size > MAX_FILE_SIZE,
        rawFile: f,
      })),
    ]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles([...e.dataTransfer.files]);
  };

  const handleBrowse = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.multiple = true; inp.accept = '.pdf,.docx,.csv,.txt';
    inp.onchange = (e) => addFiles([...(e.target as HTMLInputElement).files!]);
    inp.click();
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleProcess = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      let supplierInput = pastedText.trim();
      if (!supplierInput && files.length > 0) {
        // Read text-based files; skip binary formats (PDF/DOCX need server extraction)
        const texts = await Promise.all(
          files
            .filter(f => f.rawFile && (f.type === 'TXT' || f.type === 'CSV'))
            .map(f => f.rawFile!.text())
        );
        supplierInput = texts.join('\n\n');
        if (!supplierInput) {
          supplierInput = `[Files uploaded: ${files.map(f => f.name).join(', ')}]`;
        }
      }
      const { run_id } = await api.createRun(supplierInput);
      onProcess({ expName: expName || 'New listing', runId: run_id });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to start pipeline');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      {/* Breadcrumb */}
      <div style={{ padding: '16px 32px 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--purps)', cursor: 'pointer', fontWeight: 500, padding: 0, fontSize: 13 }}>
          Listings
        </button>
        <ChevronRight size={13} color="var(--ink60)" />
        <span style={{ color: 'var(--ink60)' }}>New listing</span>
      </div>

      <div style={{ padding: '20px 32px 48px', maxWidth: 700, width: '100%', margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Add supplier data</h2>
        <p style={{ fontSize: 14, color: 'var(--ink60)', marginBottom: 28 }}>
          Give the agent something to work with — a document, a forwarded email, a WhatsApp thread. It'll handle the rest.
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 20 }}>
          {([['paste', 'From message or email'], ['files', 'Upload documents']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '8px 18px', fontWeight: 600, fontSize: 14, border: 'none',
              background: 'none', cursor: 'pointer',
              color: tab === id ? 'var(--purps)' : 'var(--ink60)',
              borderBottom: tab === id ? '2px solid var(--purps)' : '2px solid transparent',
              marginBottom: -2, transition: 'color 150ms',
            }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'files' ? (
          <div>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={handleBrowse}
              style={{
                border: `2px dashed ${dragOver ? 'var(--purps)' : 'var(--border)'}`,
                borderRadius: 12, padding: '40px 24px', textAlign: 'center',
                cursor: 'pointer', background: dragOver ? 'var(--dreamy)' : '#fff',
                transition: 'all 200ms',
              }}
            >
              <UploadCloud size={36} color={dragOver ? 'var(--purps)' : 'var(--ink30)'} style={{ display: 'block', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, fontSize: 14, color: dragOver ? 'var(--purps)' : 'var(--slate)' }}>Drop files here or click to browse</p>
              <p style={{ fontSize: 12, color: 'var(--ink60)', marginTop: 4 }}>PDF, DOCX, CSV, TXT · Max 25 MB per file · Up to 10 files</p>
            </div>
            {files.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {files.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, background: '#fff',
                    border: `1px solid ${f.error ? 'var(--red)' : 'var(--border)'}`, borderRadius: 8, padding: '10px 14px',
                  }}>
                    <span style={{
                      width: 32, height: 32, borderRadius: 6,
                      background: f.error ? 'var(--red-bg)' : 'var(--dreamy)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: f.error ? 'var(--red)' : 'var(--purps)', flexShrink: 0,
                    }}>
                      {f.type}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ fontSize: 12, color: f.error ? 'var(--red)' : 'var(--ink60)', whiteSpace: 'nowrap' }}>
                      {f.error ? 'File too large' : formatSize(f.size)}
                    </span>
                    <button onClick={() => setFiles(files.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink60)', padding: 2, display: 'flex', borderRadius: 4 }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ position: 'relative' }}>
              <textarea
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder={"Paste anything here — a forwarded supplier email, a WhatsApp message, a copied spec page.\n\nThe agent will extract what it needs and ignore the rest. No need to clean it up first."}
                style={{
                  width: '100%', height: 220,
                  border: `1.5px solid ${pastedText ? 'var(--purps)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '14px 16px', fontSize: 14, resize: 'none',
                  outline: 'none', lineHeight: 1.7, fontFamily: 'inherit',
                  transition: 'border-color 150ms',
                  background: pastedText ? '#fff' : '#FAFAFA', color: 'var(--slate)',
                }}
              />
              {pastedText && (
                <button onClick={() => setPastedText('')} style={{
                  position: 'absolute', top: 10, right: 10,
                  background: 'var(--ink10)', border: 'none', borderRadius: 6,
                  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--ink60)',
                }}>
                  <X size={12} />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <p style={{ fontSize: 12, color: 'var(--ink60)' }}>
                {pastedText.length === 0
                  ? "Tip: more context = better listing. Don't trim."
                  : pastedText.length < 200
                    ? '⚠ Short input — add more detail if possible'
                    : `${pastedText.length.toLocaleString()} characters · looks good`}
              </p>
              <span style={{ fontSize: 12, color: pastedText.length > 200 ? 'var(--green)' : 'var(--ink30)', fontWeight: 500 }}>
                {pastedText.length > 200 ? '✓ Ready' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Supplier picker */}
          <div ref={supplierRef} style={{ position: 'relative' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink60)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Supplier <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <div
              onClick={() => { setSupplierOpen(!supplierOpen); setSupplierQuery(''); }}
              style={{
                width: '100%', height: 40, border: `1.5px solid ${supplierOpen ? 'var(--purps)' : 'var(--border)'}`,
                borderRadius: 8, padding: '0 12px', fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', background: '#fff', transition: 'border-color 150ms', gap: 8,
              }}
            >
              {selectedSupplier ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, overflow: 'hidden' }}>
                  <span style={{ fontWeight: 600, color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedSupplier.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink60)', flexShrink: 0 }}>{selectedSupplier.id}</span>
                  <span style={{ fontSize: 11, background: 'var(--ink10)', borderRadius: 4, padding: '1px 6px', color: 'var(--ink60)', flexShrink: 0 }}>{selectedSupplier.city}</span>
                </span>
              ) : (
                <span style={{ color: 'var(--ink30)' }}>Search by name, ID or city…</span>
              )}
              {supplierOpen ? <ChevronUp size={14} color="var(--ink60)" style={{ flexShrink: 0 }} /> : <ChevronDown size={14} color="var(--ink60)" style={{ flexShrink: 0 }} />}
            </div>

            {supplierOpen && (
              <div className="fade-in" style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                background: '#fff', border: '1.5px solid var(--purps)', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden',
              }}>
                <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Search size={13} color="var(--ink60)" style={{ flexShrink: 0 }} />
                  <input
                    autoFocus
                    value={supplierQuery}
                    onChange={e => setSupplierQuery(e.target.value)}
                    placeholder="Search suppliers…"
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', background: 'transparent' }}
                  />
                  {supplierQuery && (
                    <button onClick={() => setSupplierQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink60)', padding: 0, display: 'flex' }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {filteredSuppliers.length === 0 ? (
                    <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink60)', fontSize: 13 }}>No suppliers found</div>
                  ) : filteredSuppliers.map(s => (
                    <div key={s.id}
                      onClick={() => { setSupplierID(s.id); setSupplierOpen(false); setSupplierQuery(''); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        cursor: 'pointer', background: s.id === supplierID ? 'var(--dreamy)' : 'transparent',
                        transition: 'background 100ms',
                      }}
                      onMouseEnter={e => { if (s.id !== supplierID) (e.currentTarget as HTMLDivElement).style.background = '#FAFAFA'; }}
                      onMouseLeave={e => { if (s.id !== supplierID) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                    >
                      <span style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: s.id === supplierID ? 'var(--purps)' : 'var(--ink10)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700,
                        color: s.id === supplierID ? '#fff' : 'var(--ink60)', flexShrink: 0,
                      }}>
                        {s.name.split(' ').slice(0, 2).map(w => w[0]).join('')}
                      </span>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: s.id === supplierID ? 'var(--purps)' : 'var(--slate)' }}>{s.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--ink60)', marginTop: 1 }}>{s.id} · {s.city}</p>
                      </div>
                      {s.id === supplierID && <Check size={14} color="var(--purps)" />}
                    </div>
                  ))}
                </div>
                <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
                  <p style={{ fontSize: 11, color: 'var(--ink60)' }}>Can't find a supplier? <a href="#" style={{ color: 'var(--purps)' }}>Add new supplier →</a></p>
                </div>
              </div>
            )}
          </div>

          {/* Experience name */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink60)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Experience name <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              value={expName}
              onChange={e => setExpName(e.target.value)}
              placeholder="Working title — agent will refine"
              style={{ width: '100%', height: 40, border: '1.5px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fff' }}
            />
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          {submitError && (
            <p style={{ fontSize: 13, color: 'var(--red)', textAlign: 'right' }}>
              {submitError}
            </p>
          )}
          <button onClick={handleProcess} disabled={!canProcess || submitting} style={{
            height: 44, padding: '0 28px',
            background: canProcess && !submitting ? 'var(--purps)' : 'var(--ink30)',
            color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: canProcess && !submitting ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', gap: 8, transition: 'background 150ms',
          }}>
            {submitting ? (
              <><span className="spinner" />Processing…</>
            ) : (
              <><Zap size={15} color="#fff" />Process listing</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
