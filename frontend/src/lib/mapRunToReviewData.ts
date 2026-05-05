import type { FieldData, FieldSource, FieldStatus, ReviewBlocker, ReviewWarning, ReviewData, PricingTier, PricingVariant, PriceUnit } from '../types';

function fieldStatus(
  fieldPath: string,
  blockers: ReviewBlocker[],
  warnings: ReviewWarning[],
): FieldStatus {
  if (blockers.some(b => b.field.includes(fieldPath))) return 'flag';
  if (warnings.some(w => w.field.includes(fieldPath))) return 'flag';
  return 'ready';
}

function fixReason(fieldPath: string, blockers: ReviewBlocker[], warnings: ReviewWarning[]): string | undefined {
  const blocker = blockers.find(b => b.field.includes(fieldPath));
  if (blocker) return blocker.fix_instruction;
  const warning = warnings.find(w => w.field.includes(fieldPath));
  if (warning) return `${warning.issue} ${warning.suggestion}`.trim();
  return undefined;
}

function fieldAction(fieldPath: string, blockers: ReviewBlocker[]): ReviewBlocker['action_required'] | undefined {
  return blockers.find(b => b.field.includes(fieldPath))?.action_required;
}

function getSourceType(sources: Record<string, string>, path: string): string | null {
  if (sources[path]) return sources[path];
  if (sources[`${path}.0`]) return sources[`${path}.0`];
  const prefix = `${path}.`;
  const key = Object.keys(sources).find(k => k.startsWith(prefix));
  return key ? sources[key] : null;
}

function getSupplierQuote(flagMap: Map<string, string>, path: string): string | null {
  if (flagMap.has(path)) return flagMap.get(path)!;
  if (flagMap.has(`${path}.0`)) return flagMap.get(`${path}.0`)!;
  const prefix = `${path}.`;
  for (const [k, v] of flagMap) {
    if (k.startsWith(prefix)) return v;
  }
  return null;
}

function makeSource(
  sources: Record<string, string>,
  flagMap: Map<string, string>,
  path: string,
): FieldSource | null {
  const type = getSourceType(sources, path);
  if (!type) return null;
  if (type === 'AGENT-GENERATED') return { kind: 'ai', quote: null };
  if (type === 'DEFAULT') return null;
  // EXPLICIT or INFERRED → supplier data
  const quote = getSupplierQuote(flagMap, path);
  return { kind: 'supplier', quote };
}

function pricingTierLabel(ageGroup: string, minAge?: number | null, maxAge?: number | null): string {
  const base: Record<string, string> = { ADULT: 'Adult', CHILD: 'Child', YOUTH: 'Youth', INFANT: 'Infant', SENIOR: 'Senior' };
  const name = base[ageGroup] ?? ageGroup;
  if (ageGroup === 'INFANT' && maxAge != null) return `${name} (under ${maxAge + 1})`;
  if (minAge != null && maxAge != null) return `${name} (${minAge}–${maxAge})`;
  if (minAge != null) return `${name} (${minAge}+)`;
  if (maxAge != null) return `${name} (under ${maxAge + 1})`;
  return name;
}

function formatCancelType(type: string): string {
  return type.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

type CancelTier = { cutoffHours?: number; refundPercentage?: number };

function cancelTiersToText(tiers: CancelTier[]): string {
  const sorted = [...tiers].sort((a, b) => (b.cutoffHours ?? 0) - (a.cutoffHours ?? 0));
  return sorted.map(t => {
    const h = t.cutoffHours;
    const pct = t.refundPercentage;
    if (pct === 100) return h ? `Full refund if cancelled ${h}+ hours before` : 'Full refund';
    if (pct === 0) return h ? `Non-refundable within ${h} hours` : 'Non-refundable';
    return `${pct}% refund${h ? ` if cancelled ${h}+ hours before` : ''}`;
  }).join(' · ');
}

interface AmbiguityFlagRaw {
  field: string;
  supplier_text?: string | null;
}

export function mapRunToReviewData(
  mergedListing: Record<string, unknown>,
  intakeArtifact?: Record<string, unknown>,
): ReviewData {
  const listing = (mergedListing.listing ?? {}) as Record<string, unknown>;
  const intakePayload = (mergedListing.intake_payload ?? {}) as Record<string, unknown>;

  // Prefer _sources and ambiguity_flags from the separate intake artifact (which has
  // the full intake.json content), falling back to intake_payload for older runs.
  const intakeFull = (intakeArtifact ?? intakePayload) as Record<string, unknown>;
  const sources = (intakeFull._sources ?? intakePayload._sources ?? {}) as Record<string, string>;
  const rawFlags = (intakeFull.ambiguity_flags ?? []) as AmbiguityFlagRaw[];

  // Build lookup: field path → supplier quote (only entries that actually have text)
  const flagMap = new Map<string, string>(
    rawFlags
      .filter(f => f.supplier_text)
      .map(f => [f.field, f.supplier_text as string]),
  );

  const reviewSection = (mergedListing as Record<string, unknown>);
  const reviewData = reviewSection.review as Record<string, unknown> | undefined;
  const blockers: ReviewBlocker[] = (reviewData?.blockers as ReviewBlocker[]) ?? [];
  const warnings: ReviewWarning[] = (reviewData?.warnings as ReviewWarning[]) ?? [];

  const titleObj = listing.title as Record<string, string> | undefined;
  const primary = titleObj?.primary ?? '';
  const abVariant = titleObj?.ab_variant ?? '';
  const titleOptions = [primary, abVariant].filter(Boolean);

  const descObj = listing.description as Record<string, unknown> | undefined;
  const shortDesc = descObj?.short as Record<string, string> | undefined;
  const shortPrimary = shortDesc?.primary ?? '';
  const shortAb = shortDesc?.ab_variant ?? '';
  const descOptions = [shortPrimary, shortAb].filter(Boolean);

  const highlights = ((listing.highlights as string[]) ?? []).map((h, i) => ({
    id: `h${i + 1}`,
    label: `Highlight ${i + 1}`,
    value: h,
    status: fieldStatus(`highlights[${i}]`, blockers, warnings),
    reason: fixReason(`highlights[${i}]`, blockers, warnings),
    source: makeSource(sources, flagMap, 'highlights'),
    action: fieldAction(`highlights[${i}]`, blockers),
  } satisfies FieldData));

  const inclusions = ((listing.inclusions as string[]) ?? []).map((inc, i) => ({
    id: `inc${i + 1}`,
    label: `Inclusion ${i + 1}`,
    value: inc,
    status: fieldStatus(`inclusions[${i}]`, blockers, warnings),
    reason: fixReason(`inclusions[${i}]`, blockers, warnings),
    source: makeSource(sources, flagMap, 'inclusions'),
    action: fieldAction(`inclusions[${i}]`, blockers),
  } satisfies FieldData));

  const exclusions = ((listing.exclusions as string[]) ?? []).map((ex, i) => ({
    id: `ex${i + 1}`,
    label: `Exclusion ${i + 1}`,
    value: ex,
    status: fieldStatus(`exclusions[${i}]`, blockers, warnings),
    reason: fixReason(`exclusions[${i}]`, blockers, warnings),
    source: makeSource(sources, flagMap, 'exclusions'),
    action: fieldAction(`exclusions[${i}]`, blockers),
  } satisfies FieldData));

  type FaqItem = { question: string; answer: string; paa_source?: string };
  const faqItems = ((listing.faqs as FaqItem[]) ?? []);
  const faqs: FieldData[] = faqItems.flatMap((faq, i) => [
    {
      id: `fq${i + 1}`,
      label: `FAQ ${i + 1} — Question`,
      value: faq.question,
      status: fieldStatus(`faqs[${i}].question`, blockers, warnings),
      reason: fixReason(`faqs[${i}].question`, blockers, warnings),
      source: faq.paa_source
        ? { kind: 'google' as const, quote: faq.paa_source }
        : makeSource(sources, flagMap, 'faqs'),
      action: fieldAction(`faqs[${i}].question`, blockers),
    } satisfies FieldData,
    {
      id: `fa${i + 1}`,
      label: `FAQ ${i + 1} — Answer`,
      value: faq.answer,
      status: fieldStatus(`faqs[${i}].answer`, blockers, warnings),
      reason: fixReason(`faqs[${i}].answer`, blockers, warnings),
      source: faq.paa_source
        ? { kind: 'google' as const, quote: faq.paa_source }
        : makeSource(sources, flagMap, 'faqs'),
      action: fieldAction(`faqs[${i}].answer`, blockers),
    } satisfies FieldData,
  ]);

  const rawCancelPolicy = intakePayload.cancellationPolicy;
  const cancellationPolicy = (rawCancelPolicy && typeof rawCancelPolicy === 'object' ? rawCancelPolicy : {}) as Record<string, unknown>;
  const cancelType = typeof cancellationPolicy.type === 'string' ? cancellationPolicy.type : undefined;
  const desc = typeof cancellationPolicy.description === 'string' && cancellationPolicy.description ? cancellationPolicy.description : undefined;
  const cancelTiers = cancellationPolicy.tiers as CancelTier[] | undefined;
  const cancelText = (() => {
    if (desc) return desc;
    if (Array.isArray(cancelTiers) && cancelTiers.length > 0) return cancelTiersToText(cancelTiers);
    const pct = typeof cancellationPolicy.refundPercentage === 'number' ? cancellationPolicy.refundPercentage : undefined;
    const hours = typeof cancellationPolicy.cutoffHours === 'number' ? cancellationPolicy.cutoffHours : undefined;
    const hoursStr = hours != null ? `${hours}h` : '';
    if (pct === 100) return hoursStr ? `Free cancellation up to ${hoursStr} before` : 'Free cancellation';
    if (pct === 0) return 'Non-refundable';
    if (pct != null) return `${pct}% refund${hoursStr ? ` if cancelled ${hoursStr} before` : ''}`;
    if (cancelType === 'FREE_CANCELLATION') return 'Free cancellation';
    if (cancelType === 'NON_REFUNDABLE') return 'Non-refundable';
    if (cancelType) return formatCancelType(cancelType);
    return 'Not specified';
  })();
  const cancelIncomplete = cancelType === 'TIERED' && !desc && (!Array.isArray(cancelTiers) || cancelTiers.length === 0);

  const rawPricingType = (intakePayload.pricingType as string | undefined) === 'PER_GROUP' ? 'PER_GROUP' : 'PER_PERSON';
  const maxGroupSize = intakePayload.maxGroupSize as number | null | undefined;
  const rawVariants = (intakePayload.variants as Record<string, unknown>[] | undefined) ?? [];
  const pricing: PricingVariant[] = rawVariants.map(v => {
    const rawTiers = (v.pricing as Record<string, unknown>[] | undefined) ?? [];
    const tiers: PricingTier[] = rawTiers.map(p => ({
      ageGroup: String(p.ageGroup ?? ''),
      label: pricingTierLabel(String(p.ageGroup ?? ''), p.minAge as number | null, p.maxAge as number | null),
      pricePerUnit: (p.pricePerUnit as number | null) ?? null,
      isFree: (p.pricePerUnit as number | null) === 0,
      currencyCode: String(p.currencyCode ?? 'USD'),
    }));
    const unit: PriceUnit = rawPricingType === 'PER_GROUP' ? 'group' : 'person';
    return {
      name: String(v.name ?? 'Standard'),
      pricingType: rawPricingType,
      unit,
      maxGroupSize,
      tiers,
    };
  });

  const seoObj = listing.seo as Record<string, unknown> | undefined;
  const tags: string[] = (seoObj?.tags as string[]) ?? [];

  return {
    title: {
      id: 'title',
      label: 'Title',
      options: titleOptions.length > 1 ? titleOptions : undefined,
      value: titleOptions.length === 1 ? titleOptions[0] : undefined,
      status: fieldStatus('listing.title', blockers, warnings),
      reason: fixReason('listing.title', blockers, warnings),
      source: makeSource(sources, flagMap, 'productName'),
      action: fieldAction('listing.title', blockers),
    },
    descHook: {
      id: 'desc',
      label: 'Description hook',
      options: descOptions.length > 1 ? descOptions : undefined,
      value: descOptions.length === 1 ? descOptions[0] : undefined,
      status: fieldStatus('listing.description', blockers, warnings),
      reason: fixReason('listing.description', blockers, warnings),
      source: makeSource(sources, flagMap, 'description'),
      action: fieldAction('listing.description', blockers),
    },
    highlights,
    inclusions,
    exclusions,
    faqs,
    pricing,
    cancellation: {
      id: 'cancel',
      label: 'Cancellation policy',
      value: cancelText,
      status: cancelIncomplete ? 'flag' : fieldStatus('cancellationPolicy', blockers, warnings),
      reason: cancelIncomplete
        ? 'Tiered policy detected but no tier details were extracted. Update manually or raise with supplier.'
        : fixReason('cancellationPolicy', blockers, warnings),
      source: makeSource(sources, flagMap, 'cancellationPolicy'),
      action: cancelIncomplete ? 'associate_action' : fieldAction('cancellationPolicy', blockers),
    },
    seoNote: {
      id: 'seo',
      label: 'SEO tags',
      value: tags.join(', ') || (seoObj?.metaDescription as string) || '',
      status: fieldStatus('seo', blockers, []),
      reason: fixReason('seo', blockers, []),
      source: null,
      action: fieldAction('seo', blockers),
    },
  };
}
