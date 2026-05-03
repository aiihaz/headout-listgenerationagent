import type { FieldData, FieldStatus, ReviewBlocker, ReviewWarning, ReviewData } from '../types';

function fieldStatus(
  fieldPath: string,
  blockers: ReviewBlocker[],
  warnings: ReviewWarning[],
): FieldStatus {
  if (blockers.some(b => b.field.includes(fieldPath))) return 'review';
  if (warnings.some(w => w.field.includes(fieldPath))) return 'caveat';
  return 'ready';
}

function fixReason(fieldPath: string, blockers: ReviewBlocker[]): string | undefined {
  return blockers.find(b => b.field.includes(fieldPath))?.fix_instruction;
}

function fixCaveat(fieldPath: string, warnings: ReviewWarning[]): string | undefined {
  return warnings.find(w => w.field.includes(fieldPath))?.message;
}

function sourceLabel(sources: Record<string, string>, path: string): string | null {
  const type = sources?.[path];
  if (!type) return null;
  if (type === 'EXPLICIT') return 'Supplier data (explicit)';
  if (type === 'INFERRED') return 'Agent inferred from context';
  if (type === 'DEFAULT') return 'Pipeline default';
  if (type === 'AGENT-GENERATED') return 'AI-generated';
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
  } satisfies FieldData));

  const inclusions = ((listing.inclusions as string[]) ?? []).map((inc, i) => ({
    id: `inc${i + 1}`,
    label: `Inclusion ${i + 1}`,
    value: inc,
    status: fieldStatus(`inclusions[${i}]`, blockers, warnings),
    reason: fixReason(`inclusions[${i}]`, blockers),
    source: sourceLabel(sources, 'inclusions'),
  } satisfies FieldData));

  const exclusions = ((listing.exclusions as string[]) ?? []).map((ex, i) => ({
    id: `ex${i + 1}`,
    label: `Exclusion ${i + 1}`,
    value: ex,
    status: fieldStatus(`exclusions[${i}]`, blockers, warnings),
    reason: fixReason(`exclusions[${i}]`, blockers),
    source: sourceLabel(sources, 'exclusions'),
  } satisfies FieldData));

  type FaqItem = { question: string; answer: string };
  const faqItems = ((listing.faqs as FaqItem[]) ?? []);
  const faqs: FieldData[] = faqItems.flatMap((faq, i) => [
    {
      id: `fq${i + 1}`,
      label: `FAQ ${i + 1} — Question`,
      value: faq.question,
      status: fieldStatus(`faqs[${i}].question`, blockers, warnings),
      reason: fixReason(`faqs[${i}].question`, blockers),
      source: sourceLabel(sources, 'faqs'),
    } satisfies FieldData,
    {
      id: `fa${i + 1}`,
      label: `FAQ ${i + 1} — Answer`,
      value: faq.answer,
      status: fieldStatus(`faqs[${i}].answer`, blockers, warnings),
      reason: fixReason(`faqs[${i}].answer`, blockers),
      source: sourceLabel(sources, 'faqs'),
    } satisfies FieldData,
  ]);

  const cancellationPolicy = (intakePayload.cancellationPolicy as Record<string, unknown>) ?? {};
  const cancelText = cancellationPolicy.type
    ? `${cancellationPolicy.type} — ${cancellationPolicy.refundPercentage ?? 0}% refund, ${cancellationPolicy.cutoffHours ?? 0}h cutoff`
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
    },
    descHook: {
      label: 'Description hook',
      options: descOptions.length > 1 ? descOptions : undefined,
      value: descOptions.length === 1 ? descOptions[0] : undefined,
      status: fieldStatus('listing.description', blockers, warnings),
      reason: fixReason('listing.description', blockers),
      caveat: fixCaveat('listing.description', warnings),
      source: sourceLabel(sources, 'description'),
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
    },
    seoNote: {
      id: 'seo',
      label: 'SEO tags',
      value: tags.join(', ') || (seoObj?.metaDescription as string) || '',
      status: fieldStatus('seo', blockers, warnings),
      reason: fixReason('seo', blockers),
      source: null,
    },
  };
}
