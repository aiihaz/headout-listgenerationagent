export type Screen =
  | 'dashboard'
  | 'upload'
  | 'processing'
  | 'review'
  | 'publish'
  | 'published';

export type FieldStatus = 'ready' | 'caveat' | 'review';
export type ListingStatus = 'Draft' | 'Processing' | 'In Review' | 'Ready' | 'Published' | 'Failed';
export type VerdictType = 'ready' | 'caveat' | 'review' | null;

export interface ListingRow {
  id: number;
  supplier: string;
  experience: string;
  city: string;
  status: ListingStatus;
  verdict: VerdictType;
  flags: number | null;
  updated: string;
  assignee: string;
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
  files: UploadedFile[];
}

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  error?: boolean;
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
