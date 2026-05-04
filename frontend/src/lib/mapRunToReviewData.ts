import type { FieldData, FieldStatus, ReviewBlocker, ReviewWarning, ReviewData } from '../types';

function fieldStatus(
  fieldPath: string,
  blockers: ReviewBlocker[],
  warnings: ReviewWarning[],
): FieldStatus {
  const blocker = blockers.find(b => b.field.includes(fieldPath));
  if (blocker) return blocker.action_required === 'associate_action' ? 'associate_action' : 'review';
  if (warnings.some(w => w.field.includes(fieldPath))) return 'caveat';
  return 'ready';
}

function fixReason(fieldPath: string, blockers: ReviewBlocker[]): string | undefined {
  return blockers.find(b => b.field.includes(fieldPath))?.fix_instruction;
}

function fieldAction(fieldPath: string, blockers: ReviewBlocker[]): ReviewBlocker['action_required'] | undefined {
  return blockers.find(b => b.field.includes(fieldPath))?.action_required;
}

function fixCaveat(fieldPath: string, warnings: ReviewWarning[]): string | undefined {
  return warnings.find(w => w.field.includes(fieldPath))?.message;
}

function sourceLabel(sources: Record<string, string>, path: string): string | null {
  const type = sources?.[path];
  if (!type) return null;
  if (type === 'EXPLICIT') return 'From supplier input';
  if (type === 'INFERRED') return 'Inferred from supplier context';
  if (type === 'DEFAULT') return 'Pipeline default';
  if (type === 'AGENT-GENERATED') return 'AI-generated';
  return type;
}

function formatCancelType(type: string): string {
  if (type === 'FREE_CANCELLATION') return 'Free cancellation';
  if (type === 'PARTIAL_REFUND') return 'Partial refund';
  if (type === 'NO_REFUND') return 'Non-refundable';
  return type;
}

export function mapRunToReviewData(
  mergedListing: Record<string, unknown>,
): ReviewData {
  const listing = (mergedListing.listing ?? {}) as Record<string, unknown>;
  const intakePayload = (mergedListing.intake_payload ?? {}) as Record<string, unknown>;
  const sources = (intakePayload._sources ?? {}) as Record<string, string>;

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
    reason: fixReason(`highlights[${i}]`, blockers),
    caveat: fixCaveat(`highlights[${i}]`, warnings),
    source: sourceLabel(sources, 'highlights'),
    action: fieldAction(`highlights[${i}]`, blockers),
  } satisfies FieldData));

  const inclusions = ((listing.inclusions as string[]) ?? []).map((inc, i) => ({
    id: `inc${i + 1}`,
    label: `Inclusion ${i + 1}`,
    value: inc,
    status: fieldStatus(`inclusions[${i}]`, blockers, warnings),
    reason: fixReason(`inclusions[${i}]`, blockers),
    source: sourceLabel(sources, 'inclusions'),
    action: fieldAction(`inclusions[${i}]`, blockers),
  } satisfies FieldData));

  const exclusions = ((listing.exclusions as string[]) ?? []).map((ex, i) => ({
    id: `ex${i + 1}`,
    label: `Exclusion ${i + 1}`,
    value: ex,
    status: fieldStatus(`exclusions[${i}]`, blockers, warnings),
    reason: fixReason(`exclusions[${i}]`, blockers),
    source: sourceLabel(sources, 'exclusions'),
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
      reason: fixReason(`faqs[${i}].question`, blockers),
      source: faq.paa_source
        ? `Google users also ask: "${faq.paa_source}"`
        : sourceLabel(sources, 'faqs'),
      action: fieldAction(`faqs[${i}].question`, blockers),
    } satisfies FieldData,
    {
      id: `fa${i + 1}`,
      label: `FAQ ${i + 1} — Answer`,
      value: faq.answer,
      status: fieldStatus(`faqs[${i}].answer`, blockers, warnings),
      reason: fixReason(`faqs[${i}].answer`, blockers),
      source: faq.paa_source
        ? `Google users also ask: "${faq.paa_source}"`
        : sourceLabel(sources, 'faqs'),
      action: fieldAction(`faqs[${i}].answer`, blockers),
    } satisfies FieldData,
  ]);

  const cancellationPolicy = (intakePayload.cancellationPolicy as Record<string, unknown>) ?? {};
  const cancelType = cancellationPolicy.type as string | undefined;
  const cancelText = cancelType
    ? (() => {
        const label = formatCancelType(cancelType);
        const pct = cancellationPolicy.refundPercentage as number | undefined;
        const hours = cancellationPolicy.cutoffHours as number | undefined;
        if (cancelType === 'FREE_CANCELLATION') return hours ? `${label} up to ${hours}h before` : label;
        if (cancelType === 'NO_REFUND') return label;
        return `${label}${pct != null ? ` — ${pct}% back` : ''}${hours != null ? ` if cancelled ${hours}h before` : ''}`;
      })()
    : 'Not specified';

  const seoObj = listing.seo as Record<string, unknown> | undefined;
  const tags: string[] = (seoObj?.tags as string[]) ?? [];

  return {
    title: {
      label: 'Title',
      options: titleOptions.length > 1 ? titleOptions : undefined,
      value: titleOptions.length === 1 ? titleOptions[0] : undefined,
      status: fieldStatus('listing.title', blockers, warnings),
      reason: fixReason('listing.title', blockers),
      caveat: fixCaveat('listing.title', warnings),
      source: sourceLabel(sources, 'productName'),
      action: fieldAction('listing.title', blockers),
    },
    descHook: {
      label: 'Description hook',
      options: descOptions.length > 1 ? descOptions : undefined,
      value: descOptions.length === 1 ? descOptions[0] : undefined,
      status: fieldStatus('listing.description', blockers, warnings),
      reason: fixReason('listing.description', blockers),
      caveat: fixCaveat('listing.description', warnings),
      source: sourceLabel(sources, 'description'),
      action: fieldAction('listing.description', blockers),
    },
    highlights,
    inclusions,
    exclusions,
    faqs,
    cancellation: {
      id: 'cancel',
      label: 'Cancellation policy',
      value: cancelText,
      status: fieldStatus('cancellationPolicy', blockers, warnings),
      reason: fixReason('cancellationPolicy', blockers),
      source: sourceLabel(sources, 'cancellationPolicy'),
      action: fieldAction('cancellationPolicy', blockers),
    },
    seoNote: {
      id: 'seo',
      label: 'SEO tags',
      value: tags.join(', ') || (seoObj?.metaDescription as string) || '',
      status: fieldStatus('seo', blockers, warnings),
      reason: fixReason('seo', blockers),
      source: null,
      action: fieldAction('seo', blockers),
    },
  };
}
