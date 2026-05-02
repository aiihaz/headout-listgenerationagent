-- Enable pgvector (run once per project in Supabase SQL editor)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Run state machine. One row per pipeline execution.
CREATE TABLE runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by    UUID REFERENCES auth.users(id),

  supplier_input TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'duplicate_check',
    'intake_in_progress',
    'intake_complete',
    'awaiting_supplier',
    'awaiting_images',
    'generation_in_progress',
    'generation_complete',
    'review_in_progress',
    'ready_for_approval',
    'regeneration_in_progress',
    'escalated_to_human',
    'approved',
    'published',
    'intake_failed',
    'generation_blocked'
  )),

  duplicate_run_id UUID REFERENCES runs(id),
  duplicate_score  FLOAT,

  model           TEXT DEFAULT 'gemini-2.5-flash',
  regeneration_count INTEGER DEFAULT 0,

  error_message   TEXT
);

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER runs_updated_at
  BEFORE UPDATE ON runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- JSON artifact blobs. One row per artifact type per run.
CREATE TABLE run_artifacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  type       TEXT NOT NULL CHECK (type IN (
    'intake',
    'listing',
    'listing_v2',
    'verified_json_ld',
    'merged_listing',
    'merged_listing_v2',
    'review',
    'review_v2',
    'escalation_record',
    'supplier_email_draft'
  )),
  payload    JSONB NOT NULL
);

CREATE UNIQUE INDEX run_artifacts_run_id_type ON run_artifacts(run_id, type);

-- Uploaded images for a run.
CREATE TABLE run_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  storage_path  TEXT NOT NULL,
  alt_text      TEXT,
  width_px      INTEGER,
  height_px     INTEGER,
  passes_spec   BOOLEAN,
  fail_reason   TEXT
);

-- Published listings. Written once on approval.
CREATE TABLE listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          UUID NOT NULL REFERENCES runs(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  published_at    TIMESTAMPTZ,
  title           TEXT NOT NULL,
  short_description TEXT,
  payload         JSONB NOT NULL
  -- embedding VECTOR(768) added in Phase 2 after pgvector is enabled
);

-- Row Level Security — enabled on ALL four tables
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own runs" ON runs
  FOR ALL USING (auth.uid() = created_by);

ALTER TABLE run_artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own run artifacts" ON run_artifacts
  FOR ALL USING (
    auth.uid() = (SELECT created_by FROM runs WHERE id = run_id)
  );

ALTER TABLE run_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own run images" ON run_images
  FOR ALL USING (
    auth.uid() = (SELECT created_by FROM runs WHERE id = run_id)
  );

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own listings" ON listings
  FOR ALL USING (
    auth.uid() = (SELECT created_by FROM runs WHERE id = run_id)
  );
