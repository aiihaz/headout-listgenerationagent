export type Screen =
  | 'login'
  | 'dashboard'
  | 'upload'
  | 'processing'
  | 'review'
  | 'publish'
  | 'published';

export type FieldStatus = 'ready' | 'caveat' | 'review';
export type ListingStatus = 'Draft' | 'Processing' | 'In Review' | 'Ready' | 'Published' | 'Failed';
export type VerdictType = 'ready' | 'caveat' | 'review' | null;

export type RunStatus =
  | 'pending'
  | 'duplicate_check'
  | 'intake_in_progress'
  | 'intake_complete'
  | 'serper_in_progress'
  | 'serper_complete'
  | 'serper_skipped'
  | 'awaiting_supplier'
  | 'awaiting_images'
  | 'generation_in_progress'
  | 'generation_complete'
  | 'review_in_progress'
  | 'ready_for_publish'
  | 'regeneration_in_progress'
  | 'escalated_to_human'
  | 'approved'
  | 'published'
  | 'intake_failed'
  | 'generation_blocked'
  | 'unknown';

export const TERMINAL_OK: RunStatus[] = ['ready_for_publish', 'approved', 'published'];
export const TERMINAL_FAIL: RunStatus[] = ['intake_failed', 'generation_blocked', 'escalated_to_human'];

export function runStatusToListingStatus(s: RunStatus): ListingStatus {
  if (s === 'published' || s === 'approved') return 'Published';
  if (s === 'ready_for_publish') return 'Ready';
  if (s === 'intake_failed' || s === 'generation_blocked') return 'Failed';
  if (
    s === 'intake_in_progress' || s === 'intake_complete' ||
    s === 'generation_in_progress' || s === 'generation_complete' ||
    s === 'review_in_progress' || s === 'duplicate_check' ||
    s === 'pending'
  ) return 'Processing';
  if (s === 'regeneration_in_progress' || s === 'escalated_to_human') return 'In Review';
  return 'Draft';
}

export interface ApiRun {
  id: string;
  status: RunStatus;
  supplier_input: string;
  supplier_name?: string;
  created_at?: string;
  updated_at?: string;
  error_message?: string | null;
}

export interface ReviewBlocker {
  id: string;
  field: string;
  type: string;
  found: string;
  intake_says: string;
  severity: string;
  fix_instruction: string;
}

export interface ReviewWarning {
  id: string;
  field: string;
  message: string;
}

export interface RunArtifacts {
  intake?: Record<string, unknown>;
  listing?: Record<string, unknown>;
  merged_listing?: Record<string, unknown>;
  review?: {
    review?: {
      overall: string;
      scores: Record<string, number>;
      blockers: ReviewBlocker[];
      warnings: ReviewWarning[];
      escalate_to_human: boolean;
    };
  };
  [key: string]: unknown;
}

export interface RunDetail extends ApiRun {
  artifacts: RunArtifacts;
}

export interface ListingRow {
  id: string;
  supplier: string;
  experience: string;
  city: string;
  status: ListingStatus;
  verdict: VerdictType;
  flags: number | null;
  updated: string;
  assignee: string;
  runId: string;
}

export interface FieldData {
  id?: string;
  label: string;
  value?: string;
  options?: string[];    // A/B/C variants
  status: FieldStatus;
  reason?: string;       // why this needs review
  caveat?: string;       // caveat message
  source: string | null; // null = agent inferred
}

export interface ProcessData {
  expName: string;
  runId: string;
}

export interface ReviewData {
  title: FieldData;
  descHook: FieldData;
  highlights: FieldData[];
  inclusions: FieldData[];
  exclusions: FieldData[];
  faqs: FieldData[];
  cancellation: FieldData;
  seoNote: FieldData;
}
