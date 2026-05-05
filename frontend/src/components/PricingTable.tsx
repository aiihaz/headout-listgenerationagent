import { useState } from 'react';
import { Pencil, X, Check, ChevronDown, Send } from 'lucide-react';
import { StatusPill } from './StatusPill';
import type { PricingVariant, PricingTier, PriceUnit, FieldStatus } from '../types';

const UNIT_LABELS: Record<PriceUnit, string> = {
  person: '/ person',
  group: '/ group',
  hour: '/ hour',
  day: '/ day',
  ride: '/ ride',
  session: '/ session',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', AED: 'AED ', AUD: 'A$', CAD: 'C$',
};

function formatPrice(tier: PricingTier): string {
  if (tier.isFree) return 'Free';
  if (tier.pricePerUnit == null) return '—';
  const sym = CURRENCY_SYMBOLS[tier.currencyCode] ?? `${tier.currencyCode} `;
  return `${sym}${tier.pricePerUnit.toFixed(2)}`;
}

function derivePricingStatus(variants: PricingVariant[]): FieldStatus {
  if (variants.length === 0) return 'flag';
  for (const v of variants) {
    if (v.tiers.length === 0) return 'flag';
    const hasAdult = v.tiers.some(t => t.ageGroup === 'ADULT' || t.ageGroup === 'GROUP');
    if (!hasAdult) return 'flag';
    if (v.tiers.some(t => !t.isFree && t.pricePerUnit == null)) return 'flag';
  }
  return 'ready';
}

interface VariantTableProps {
  variant: PricingVariant;
  unit: PriceUnit;
  editing: boolean;
  prices: Record<string, number | null>;
  onPriceChange: (ageGroup: string, val: number | null) => void;
}

function VariantTable({ variant, unit, editing, prices, onPriceChange }: VariantTableProps) {
  const showAgeRange = variant.tiers.some(t => t.label !== t.ageGroup && t.label.includes('('));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate)' }}>{variant.name}</span>
        {variant.pricingType === 'PER_GROUP' && variant.maxGroupSize && (
          <span style={{ fontSize: 11, color: 'var(--ink60)', background: 'var(--ink10)', borderRadius: 4, padding: '1px 6px' }}>
            up to {variant.maxGroupSize} pax
          </span>
        )}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 600, color: 'var(--ink60)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Category</th>
            {showAgeRange && (
              <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 600, color: 'var(--ink60)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Age range</th>
            )}
            <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 11, fontWeight: 600, color: 'var(--ink60)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Rate</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 600, color: 'var(--ink60)', letterSpacing: '0.06em', textTransform: 'uppercase', width: 80 }}>{UNIT_LABELS[unit]}</th>
          </tr>
        </thead>
        <tbody>
          {variant.tiers.map((tier, i) => {
            const isLast = i === variant.tiers.length - 1;
            const baseLabel = tier.label.includes('(') ? tier.label.split('(')[0].trim() : tier.label;
            const ageRange = tier.label.includes('(') ? tier.label.match(/\((.+)\)/)?.[1] : undefined;
            const currentPrice = prices[tier.ageGroup];
            return (
              <tr key={tier.ageGroup} style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
                <td style={{ padding: '10px 8px', fontWeight: 500, color: 'var(--slate)' }}>{baseLabel}</td>
                {showAgeRange && (
                  <td style={{ padding: '10px 8px', color: 'var(--ink60)', fontSize: 12 }}>{ageRange ?? '—'}</td>
                )}
                <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                  {tier.isFree ? (
                    <span style={{ fontWeight: 600, color: '#166534', background: 'var(--green-bg)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>Free</span>
                  ) : editing ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink60)' }}>{CURRENCY_SYMBOLS[tier.currencyCode] ?? tier.currencyCode}</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={currentPrice ?? ''}
                        onChange={e => onPriceChange(tier.ageGroup, e.target.value === '' ? null : parseFloat(e.target.value))}
                        style={{
                          width: 80, height: 28, border: '1.5px solid var(--purps)',
                          borderRadius: 6, padding: '0 8px', fontSize: 13,
                          textAlign: 'right', outline: 'none', fontFamily: 'inherit',
                        }}
                      />
                    </div>
                  ) : (
                    <span style={{
                      fontWeight: 600, color: currentPrice == null ? 'var(--ink30)' : 'var(--slate)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {currentPrice == null
                        ? formatPrice(tier)
                        : `${CURRENCY_SYMBOLS[tier.currencyCode] ?? tier.currencyCode}${currentPrice.toFixed(2)}`
                      }
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px 8px', color: 'var(--ink60)', fontSize: 12 }}>
                  {!tier.isFree && UNIT_LABELS[unit]}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface PricingTableProps {
  variants: PricingVariant[];
  onResolve?: () => void;
}

export function PricingTable({ variants, onResolve }: PricingTableProps) {
  const [editing, setEditing] = useState(false);
  const [unitOverride, setUnitOverride] = useState<PriceUnit | null>(null);
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [resolved, setResolved] = useState(false);

  const initPrices = () => {
    const map: Record<string, Record<string, number | null>> = {};
    for (const v of variants) {
      map[v.name] = {};
      for (const t of v.tiers) map[v.name][t.ageGroup] = t.pricePerUnit ?? null;
    }
    return map;
  };
  const [editedPrices, setEditedPrices] = useState<Record<string, Record<string, number | null>>>(initPrices);

  const isDirty = variants.some(v =>
    v.tiers.some(t => {
      const original = t.pricePerUnit ?? null;
      const current = editedPrices[v.name]?.[t.ageGroup] ?? null;
      return original !== current;
    })
  );

  const status: FieldStatus = resolved ? 'ready' : derivePricingStatus(variants);
  const activeUnit = unitOverride ?? (variants[0]?.unit ?? 'person');

  const borderColor = editing ? 'var(--purps)' : status === 'flag' ? '#FDE68A' : 'var(--border)';
  const headerBg = status === 'flag' ? '#FFFBEB' : '#FAFAFA';
  const headerBorder = status === 'flag' ? '#FDE68A' : 'var(--border)';

  const handleSave = () => {
    setEditing(false);
    if (isDirty && status !== 'ready' && onResolve) {
      setResolved(true);
      onResolve();
    }
  };

  const handleRaiseWithSupplier = () => {
    window.dispatchEvent(new CustomEvent('raiseWithSupplier'));
  };

  if (variants.length === 0) {
    return (
      <div style={{ border: '1.5px solid #FDE68A', borderRadius: 10, background: '#fff', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 8, borderBottom: '1px solid #FDE68A', background: '#FFFBEB' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate)', fontFamily: 'var(--font-display)' }}>Pricing</span>
          <StatusPill status="flag" />
        </div>
        <div style={{ padding: '14px', color: 'var(--ink60)', fontSize: 13 }}>
          No pricing data extracted — supplier input did not include pricing. Add manually or raise with supplier.
        </div>
      </div>
    );
  }

  return (
    <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: 10, background: '#fff', marginBottom: 10, transition: 'border-color 200ms' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 8, borderBottom: `1px solid ${headerBorder}`, background: headerBg }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate)', fontFamily: 'var(--font-display)', flex: 1 }}>Pricing</span>
        <StatusPill status={status} />

        {/* Unit switcher */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setUnitPickerOpen(!unitPickerOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, height: 26, padding: '0 10px',
              borderRadius: 6, border: '1px solid var(--border)', background: '#fff',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--ink60)',
            }}
          >
            {UNIT_LABELS[activeUnit]} <ChevronDown size={11} />
          </button>
          {unitPickerOpen && (
            <div className="fade-in" style={{
              position: 'absolute', right: 0, top: 'calc(100% + 4px)',
              background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden', minWidth: 120,
            }}>
              {(Object.keys(UNIT_LABELS) as PriceUnit[]).map(u => (
                <button
                  key={u}
                  onClick={() => { setUnitOverride(u); setUnitPickerOpen(false); }}
                  style={{
                    display: 'block', width: '100%', padding: '8px 14px', textAlign: 'left',
                    background: activeUnit === u ? 'var(--dreamy)' : 'transparent',
                    border: 'none', fontSize: 13, color: activeUnit === u ? 'var(--purps)' : 'var(--slate)',
                    fontWeight: activeUnit === u ? 600 : 400, cursor: 'pointer',
                  }}
                >
                  {UNIT_LABELS[u]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Edit / Save */}
        {editing ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setEditing(false)} style={{
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
          <button onClick={() => setEditing(true)} style={{
            display: 'flex', alignItems: 'center', gap: 4, height: 26, padding: '0 10px',
            borderRadius: 6, border: '1px solid var(--border)', background: '#fff',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--ink60)',
          }}>
            <Pencil size={12} /> Edit
          </button>
        )}
      </div>

      {/* Tables */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {variants.map(v => (
          <VariantTable
            key={v.name}
            variant={v}
            unit={activeUnit}
            editing={editing}
            prices={editedPrices[v.name] ?? {}}
            onPriceChange={(ageGroup, val) =>
              setEditedPrices(prev => ({ ...prev, [v.name]: { ...prev[v.name], [ageGroup]: val } }))
            }
          />
        ))}
      </div>

      {/* Missing pricing notice */}
      {status === 'flag' && !resolved && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px' }}>
          <p style={{ fontSize: 12, color: '#92400E', fontStyle: 'italic', marginBottom: 10 }}>
            Some price tiers are missing — verify with supplier.
          </p>
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
        </div>
      )}
    </div>
  );
}
