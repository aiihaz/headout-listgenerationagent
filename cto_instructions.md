# CTO Architecture Instructions — Headout Listing Generation Agent
# Web Application Layer

> **Status**: Architecture decided, ready to implement
> **Date**: 2026-05-02
> **Built by**: External / pre-production
> **Constraint**: Free tier + open source only

---

## 1. What's Already Built (CLI Pipeline)

The core AI pipeline is complete and running. Do not touch these files unless fixing a bug.

```
agents/
  intake_agent.py          ← Gemini call, 2-attempt JSON retry
  content_generator.py     ← Gemini call + targeted regen logic
  template_engine.py       ← Deterministic Python: intake → schema.org JSON-LD
  review_agent.py          ← Gemini call, auto-escalates on second fail
  duplicate_detector.py    ← difflib similarity check vs listings/ directory
  email_generator.py       ← formats ambiguity_flags → supplier email draft

models/
  intake.py                ← Pydantic: IntakeResult, IntakeMeta, AmbiguityFlag
  listing.py               ← Pydantic: ListingOutput, Listing, Variant, FAQ, SEO
  review.py                ← Pydantic: ReviewOutput, ReviewBlocker, ReviewWarning

orchestrator.py            ← 12-state pipeline machine, saves artifacts per run
generate_listing.py        ← Typer CLI (demo only — not the web entrypoint)
```

The next phase wraps `orchestrator.py` in a FastAPI server and replaces the `listings/` filesystem store with Supabase PostgreSQL.

---

## 2. Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Vercel — free tier)                                │
│  React 18 + Vite + TypeScript + Tailwind + shadcn/ui        │
│  8 screens from mvp_product_brief.md                        │
│  Supabase JS SDK for auth + realtime + storage              │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS + WebSocket
┌───────────────────────▼─────────────────────────────────────┐
│  FastAPI (Render — free tier, 750h/month)                   │
│  Python 3.11                                                │
│  Uvicorn + Gunicorn for prod                                │
│  orchestrator.py wrapped in async background tasks          │
│  Pydantic models re-used directly as FastAPI schemas        │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
┌────────────▼─────────────┐  ┌───────────▼──────────────────┐
│  Supabase (free tier)    │  │  Gemini API                   │
│  PostgreSQL 15           │  │  google-genai SDK             │
│  pgvector extension      │  │  Intake + Generator + Review  │
│  Auth (email/password)   │  │  Temperature 0 / 0.7 / 0.3   │
│  Storage 1GB (images)    │  └──────────────────────────────┘
│  Realtime (WebSocket)    │
└──────────────────────────┘
```

### Why this stack

| Decision | Choice | Reason |
|---|---|---|
| Backend language | Python + FastAPI | Existing code is Python + Pydantic — zero rewrite |
| Database | Supabase | Free PostgreSQL + pgvector + Auth + Storage + Realtime in one package |
| Frontend | React + Vite + TypeScript | Internal tool, no SEO, Vite is fast, shadcn/ui covers all 8 screens |
| Hosting (backend) | Render | 750h/month free, Python-native, easy env vars |
| Hosting (frontend) | Vercel | Unlimited personal projects free, instant deploys |
| Duplicate detection | pgvector | Replaces difflib with proper cosine similarity on embeddings |
| Real-time status | Supabase Realtime | Pipeline takes 60–90s — associate needs live updates, no separate WS server |

---

## 3. Database Schema

```sql
-- Run state machine. One row per pipeline execution.
CREATE TABLE runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by    UUID REFERENCES auth.users(id),

  -- Input
  supplier_input TEXT NOT NULL,      -- raw pasted text or CSV content

  -- State machine (mirrors orchestrator.py states)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'duplicate_check',
    'intake_in_progress',
    'intake_complete',
    'awaiting_supplier',         -- blocked on supplier clarification
    'awaiting_images',           -- images not yet uploaded
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

  -- Duplicate detection result
  duplicate_run_id UUID REFERENCES runs(id),
  duplicate_score  FLOAT,

  -- Pipeline config
  model           TEXT DEFAULT 'gemini-2.5-flash',
  regeneration_count INTEGER DEFAULT 0,

  -- Error tracking
  error_message   TEXT
);

-- JSON artifact blobs. One row per artifact type per run.
-- Avoids wide table with many nullable JSON columns.
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
CREATE UNIQUE INDEX ON run_artifacts(run_id, type);

-- Uploaded images for a run.
CREATE TABLE run_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  storage_path  TEXT NOT NULL,     -- Supabase Storage path
  alt_text      TEXT,              -- generated by pipeline
  width_px      INTEGER,
  height_px     INTEGER,
  passes_spec   BOOLEAN,           -- resolution + aspect ratio check
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
  -- Full merged_listing.json stored here for performance tracking
  payload         JSONB NOT NULL,
  -- For pgvector duplicate detection
  embedding       VECTOR(768)     -- embed: title + city + inclusions
);
CREATE INDEX ON listings USING ivfflat (embedding vector_cosine_ops);

-- pgvector extension (run once in Supabase SQL editor)
-- CREATE EXTENSION IF NOT EXISTS vector;
--
-- NOTE: embedding column is reserved for Phase 2+ semantic duplicate detection.
-- Phase 1 uses difflib (duplicate_detector.py unchanged). Do not populate this
-- column until the Gemini embedding-001 pipeline is wired up.
```

### Why JSONB blobs for artifacts

The intake/listing/review payloads evolve as agent prompts evolve. Storing them as JSONB avoids schema migrations every time a new field is added. The critical queryable fields (status, run_id, timestamps) are typed columns. Everything agent-specific is JSONB.

---

## 4. API Design

All endpoints are prefixed `/api/v1`. FastAPI generates OpenAPI docs at `/docs`.

```
POST   /api/v1/runs                    Create run, start intake in background
GET    /api/v1/runs/{run_id}           Full run status + all artifacts
PATCH  /api/v1/runs/{run_id}/fields    Resolve ambiguity flags inline
POST   /api/v1/runs/{run_id}/send-email  Send supplier clarification email
GET    /api/v1/runs/{run_id}/artifacts/{type}   Get specific artifact JSON
POST   /api/v1/runs/{run_id}/images    Upload image (Supabase Storage)
DELETE /api/v1/runs/{run_id}/images/{id}  Remove image
POST   /api/v1/runs/{run_id}/generate  Advance to copy generation step
POST   /api/v1/runs/{run_id}/regenerate  Regenerate specific sections
       Body: { sections: ["title", "faqs"] }
POST   /api/v1/runs/{run_id}/approve   Approve listing for publish
       Body: { variant: "primary" | "ab" | "both", schedule_at: ISO8601? }
GET    /api/v1/listings                List published listings (paginated)
GET    /api/v1/listings/{id}           Single listing with performance data
```

### Background task pattern

The pipeline takes 60–90s. FastAPI runs it as a background task.

**Critical:** `orchestrator.py` is synchronous. FastAPI is async. Do NOT inject an async callback into the orchestrator — it will deadlock (can't `await` inside a sync function that's already inside a running event loop). Instead, run the orchestrator in a ThreadPoolExecutor and communicate via a thread-safe Queue:

```python
# backend/services/pipeline_service.py
import asyncio
from concurrent.futures import ThreadPoolExecutor
from queue import Queue

_executor = ThreadPoolExecutor(max_workers=4)

async def run_pipeline_async(run_id: str, supplier_input: str):
    status_queue: Queue = Queue()
    loop = asyncio.get_event_loop()

    try:
        future = loop.run_in_executor(
            _executor,
            run_pipeline_sync,           # sync orchestrator wrapper
            run_id, supplier_input, status_queue
        )
        # Drain status updates while pipeline runs
        while not future.done():
            while not status_queue.empty():
                update = status_queue.get_nowait()
                await supabase_write_with_retry(run_id, update)
            await asyncio.sleep(0.5)
        await future
    except DeadlineExceeded:
        await set_run_status(run_id, 'generation_blocked',
            error='Gemini API timeout')
    except Exception as e:
        await set_run_status(run_id, 'generation_blocked', error=str(e))
```

**`supabase_write_with_retry()`** (build in Phase 1 — not deferrable):

```python
async def supabase_write_with_retry(run_id: str, update: dict, attempts: int = 3):
    for i in range(attempts):
        try:
            await db.table('runs').update(update).eq('id', run_id).execute()
            return
        except Exception:
            if i == attempts - 1:
                # Fallback: write to listings/ filesystem (existing behavior)
                write_artifact_to_disk(run_id, update)
            await asyncio.sleep(1.5 ** i)
```

The background task writes status updates to `runs.status` and artifacts to `run_artifacts` as it progresses. Supabase Realtime pushes these changes to the browser — the associate sees live progress without polling.

**Escalation persistence** (Phase 2 — required, not deferrable): When Review Agent fails twice and sets `escalate_to_human: true`, write the escalation record to `run_artifacts` table (type: `escalation_record`) in addition to the existing disk write. The UI reads this to surface the ops alert. Without this, escalated runs are invisible to anyone not watching the Render logs.

### Supabase Realtime (frontend subscription)

```typescript
// In the Copy Review screen component:
const channel = supabase
  .channel(`run:${runId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'runs',
    filter: `id=eq.${runId}`,
  }, (payload) => {
    setRunStatus(payload.new.status)
  })
  .subscribe()
```

---

## 5. Project Structure

```
list-generation-agent/
├── backend/                     ← NEW: FastAPI server
│   ├── main.py                  ← FastAPI app, CORS, middleware
│   ├── routers/
│   │   ├── runs.py              ← /api/v1/runs endpoints
│   │   ├── listings.py          ← /api/v1/listings endpoints
│   │   └── images.py            ← image upload
│   ├── services/
│   │   ├── pipeline_service.py  ← wraps orchestrator.py for async execution
│   │   ├── supabase_service.py  ← DB read/write helpers
│   │   └── storage_service.py   ← Supabase Storage uploads
│   ├── dependencies.py          ← get_current_user, get_supabase
│   └── config.py                ← env vars via pydantic-settings
│
├── frontend/                    ← NEW: React SPA
│   ├── src/
│   │   ├── pages/               ← 8 route-level components
│   │   │   ├── Ingestion.tsx
│   │   │   ├── StructuredDataReview.tsx
│   │   │   ├── SupplierEmailPreview.tsx
│   │   │   ├── ImageUpload.tsx
│   │   │   ├── CopyReview.tsx
│   │   │   ├── ReviewVerdict.tsx
│   │   │   ├── Approval.tsx
│   │   │   └── PerformanceDashboard.tsx
│   │   ├── components/          ← shared UI
│   │   │   ├── FieldCard.tsx    ← confirmed / flagged / needs-decision state
│   │   │   ├── SectionEditor.tsx ← copy section with Regenerate button
│   │   │   ├── ReviewBadge.tsx  ← pass/conditional_pass/fail badge
│   │   │   └── PipelineStatus.tsx ← live progress bar
│   │   ├── lib/
│   │   │   ├── supabase.ts      ← Supabase client init
│   │   │   ├── api.ts           ← typed FastAPI client (fetch wrapper)
│   │   │   └── types.ts         ← TypeScript types mirroring Pydantic models
│   │   ├── hooks/
│   │   │   ├── useRun.ts        ← TanStack Query + Supabase Realtime
│   │   │   └── useCurrentUser.ts
│   │   └── App.tsx              ← React Router routes
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── agents/                      ← EXISTING: do not modify
├── models/                      ← EXISTING: do not modify
├── orchestrator.py              ← EXISTING: do not modify
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql   ← schema from Section 3 above
```

---

## 6. Infrastructure Setup (step by step)

### Step 1: Supabase Project

1. Create account at supabase.com (free)
2. New project → note: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
3. SQL Editor → run `supabase/migrations/001_initial_schema.sql`
4. Enable pgvector: `CREATE EXTENSION IF NOT EXISTS vector;`
5. Storage → create bucket `listing-images`, set to private
6. Auth → Email provider enabled, no confirm email required (internal tool)
7. Create one associate user manually in Auth → Users

### Step 2: Backend (FastAPI on Render)

1. `pip install fastapi uvicorn[standard] supabase pydantic-settings python-multipart tenacity`
2. Add to `requirements.txt`
3. Create `backend/main.py` (see Section 4 pattern above)
4. Test locally: `uvicorn backend.main:app --reload`
5. Push to GitHub
6. Render → New Web Service → connect repo
7. Build command: `pip install -r requirements.txt`
8. Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
9. Env vars on Render:
   ```
   GEMINI_API_KEY=...
   SUPABASE_URL=...
   SUPABASE_SERVICE_KEY=...       ← service key for backend (bypasses RLS)
   ALLOWED_ORIGINS=https://your-app.vercel.app
   ```

### Step 3: Frontend (React on Vercel)

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install tailwindcss @tailwindcss/vite
npm install @supabase/supabase-js
npm install @tanstack/react-query
npm install openapi-typescript --save-dev
npx shadcn@latest init
npx shadcn@latest add button card badge dialog form table textarea
```

**Type codegen** (add to `package.json` scripts — never hand-write TypeScript types):

```json
"scripts": {
  "generate-types": "openapi-typescript $VITE_API_URL/openapi.json -o src/lib/types.ts",
  "dev": "npm run generate-types && vite",
  "build": "npm run generate-types && tsc && vite build"
}
```

Run `npm run generate-types` every time a Pydantic model changes. FastAPI's `/openapi.json` is the source of truth — `types.ts` is always auto-generated, never edited by hand.

Vercel → New Project → connect repo → set root to `frontend/`

Env vars on Vercel:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...        ← anon key (safe for browser)
VITE_API_URL=https://your-app.onrender.com
```

### Step 4: CORS

```python
# backend/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 7. Auth Pattern

Supabase Auth handles login. The frontend gets a JWT. FastAPI validates it:

```python
# backend/dependencies.py
from supabase import create_client
from fastapi import Depends, HTTPException, Header

async def get_current_user(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    try:
        user = supabase.auth.get_user(token)
        return user.user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
```

```typescript
// frontend: send token with every request
const { data: { session } } = await supabase.auth.getSession()
const response = await fetch(`${apiUrl}/api/v1/runs`, {
  headers: { Authorization: `Bearer ${session?.access_token}` }
})
```

Row-Level Security (RLS) on Supabase: associates can only see runs they created.

```sql
-- RLS on ALL tables (not just runs — artifacts and images must be covered too)
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
```

---

## 8. The 8 Screens — Component Map

| Screen | Route | Key state | Supabase Realtime? |
|---|---|---|---|
| Ingestion | `/` | text input, duplicate check result | No |
| Structured Data Review | `/runs/:id/review` | intake artifact, field states | Yes (status updates) |
| Supplier Email Preview | `/runs/:id/email` | supplier_email_draft artifact | No |
| Image Upload | `/runs/:id/images` | run_images table, spec checks | No |
| Copy Review | `/runs/:id/copy` | merged_listing artifact, section states | Yes (generation progress) |
| Review Verdict | `/runs/:id/verdict` | review artifact, blockers | Yes (review progress) |
| Approval | `/runs/:id/approve` | variant choice, schedule | No |
| Performance Dashboard | `/listings` | listings table, CTR/A/B metrics | No |

### Field state badges (Structured Data Review)

```
confirmed           → green badge, read-only
needs_supplier_clarification → yellow badge, included in email
needs_internal_decision      → orange badge, inline edit
resolved            → grey badge, read-only
```

### Copy section state (Copy Review)

```
[Section title]  [status badge]  [Regenerate button]
[Editable content area]
[Review Agent fix instruction — shown only on fail]
```

The `Regenerate` button calls `POST /api/v1/runs/:id/regenerate` with `{ sections: ["this_section"] }`. Status updates via Realtime. The section shows a loading state while regenerating.

---

## 9. Migration: CLI → Web

The `orchestrator.py` `run_pipeline()` function currently:
1. Saves artifacts to `listings/{run_id}/` directory
2. Returns a result dict

The `pipeline_service.py` wrapper:
1. Calls `run_pipeline()` (or refactors it to accept a db client)
2. After each state transition, writes to Supabase: `runs.status` + `run_artifacts` row
3. The frontend sees status changes via Realtime without polling

Minimal invasive change: add a `persistence_callback` parameter to `orchestrator.py` that `pipeline_service.py` injects. The CLI path passes `None` (filesystem behavior unchanged). The web path passes the Supabase writer.

```python
# orchestrator.py — add optional callback
async def run_pipeline(
    supplier_input: str,
    run_id: str,
    on_state_change: Optional[Callable] = None,  # ← new
) -> dict:
    ...
    if on_state_change:
        await on_state_change(run_id, "intake_complete", intake_result)
```

---

## 10. Development Order

Build in this order. Each phase ships something usable.

### Phase 1 — Backend skeleton (2–3 days)

- `backend/main.py` with CORS
- `backend/config.py` with env vars
- `backend/dependencies.py` with Supabase auth validation
- `backend/routers/runs.py` with `POST /runs` and `GET /runs/:id`
- `supabase/migrations/001_initial_schema.sql` applied
- Health check endpoint: `GET /health`
- Deploy to Render

Done when: `curl -X POST https://your-app.onrender.com/api/v1/runs` returns a `run_id`.

**Also required in Phase 1**: `supabase_write_with_retry()` helper with 3-attempt retry + filesystem fallback. Add `keep-warm.yml` GitHub Actions workflow (cron ping every 14 minutes to prevent Render cold starts).

### Phase 2 — Pipeline integration (2–3 days)

- `backend/services/pipeline_service.py` wrapping `orchestrator.py`
- State machine writes to `runs.status` and `run_artifacts` on each transition
- Background task wired to `POST /runs`
- `PATCH /runs/:id/fields` for inline field resolution
- `POST /runs/:id/regenerate` for targeted section regen

Done when: a full pipeline run completes end-to-end and the artifacts are readable from Supabase.

### Phase 3 — Frontend (5–7 days)

Build screens in workflow order:

1. Ingestion screen → calls `POST /runs`, redirects to review
2. Structured Data Review → reads intake artifact, resolves fields
3. Supplier Email Preview → reads email draft artifact
4. Image Upload → `POST /runs/:id/images` → Supabase Storage
5. Copy Review → reads merged_listing, section regeneration
6. Review Verdict → reads review artifact, shows blockers
7. Approval screen → calls `POST /runs/:id/approve`
8. Performance Dashboard → reads listings table

Add Supabase Realtime subscriptions to screens 2, 5, 6 so the associate sees live pipeline progress.

Done when: an associate can paste supplier text and reach an approved listing without touching the terminal.

### Phase 4 — Auth + hardening (1–2 days)

- Login screen (Supabase Auth)
- RLS policies
- Error boundaries on every screen
- Retry UI for escalated runs
- Deploy frontend to Vercel with env vars

---

## 11. Open Questions Before Phase 1

These block implementation. Resolve them first:

| Question | Who | Impact |
|---|---|---|
| Gemini API key — which Google Cloud project? | ihaz | Backend won't run without it |
| Render vs Railway for backend? | ihaz | Railway has $5/month cap then paid; Render is 750h/month truly free |
| Target languages for Rosetta trigger? | Localization team | Phase 3 — Approval screen |
| Image minimum spec (resolution, aspect ratio) | Design/product | Phase 3 — Image Upload screen |
| Supplier clarification form: Headout-hosted or Typeform/Tally? | Engineering | Phase 2 — email generator points to form URL |

---

## 12. What's NOT in Scope (this phase)

| Item | Reason |
|---|---|
| Rosetta translation integration | Needs Headout internal API access |
| 30-day GSC performance loop | Needs live listing + analytics access |
| Duplicate detection vs full Headout catalog | No catalog API access |
| Supplier self-serve portal | Separate product track |
| Bulk CSV ingestion | After single-listing workflow is proven |
| A/B test split publishing | JSON plan produced; actual split is Headout infra |

---

## 13. Test Coverage Requirements

Zero tests currently. Before web layer ships, these are non-negotiable:

**Test suite layout** (decided in review):
- `backend/tests/` — FastAPI integration tests (pytest + httpx AsyncClient)
- `tests/test_cli.py` — CLI pipeline invariant tests (pytest, no Supabase needed)
- `frontend/e2e/` — Playwright E2E tests (8 screens, happy path + critical errors)

**Non-negotiable tests before Phase 2 ships:**

| Test | File | Type | Why |
|---|---|---|---|
| `POST /runs` → pipeline completes → artifacts in DB | `backend/tests/test_runs.py` | Integration [→E2E] | Critical path for every listing |
| CONTRADICTED input → status = `intake_failed` | `tests/test_cli.py` | Unit | Regression: CLI already handles this |
| Regen does not mutate passing fields | `tests/test_cli.py` | Unit | Immutability invariant |
| CONDITIONAL tower access → `blocks_publish: true` | `tests/test_cli.py` | Unit | Business rule, must never regress |
| null ≠ [] in intake payload | `tests/test_cli.py` | Unit | Absence vs unknown distinction |
| Gemini timeout → `generation_blocked` state | `backend/tests/test_pipeline_service.py` | Unit (mock Gemini) | Error handling |
| Supabase write fails → filesystem fallback fires | `backend/tests/test_pipeline_service.py` | Unit (mock Supabase) | Retry logic |
| Escalation record written to run_artifacts | `backend/tests/test_pipeline_service.py` | Integration | Required Phase 2 |
| RLS: associate A cannot read associate B's run | `backend/tests/test_auth.py` | Integration | Auth correctness |
| Realtime: status update arrives in browser <2s | `frontend/e2e/pipeline.spec.ts` | E2E (Playwright) | UX correctness |

Run: `pytest backend/tests/ tests/` (Python) + `npx playwright test` (E2E)

---

## 14. GitHub Actions: Keep Render Warm

Render free tier spins down after 15 minutes of inactivity. Cold start is ~10s. Fix with a free cron ping:

```yaml
# .github/workflows/keep-warm.yml
name: Keep Render warm
on:
  schedule:
    - cron: '*/14 * * * *'   # every 14 minutes
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping health endpoint
        run: curl -sf ${{ secrets.RENDER_APP_URL }}/health || true
```

Add `RENDER_APP_URL` as a GitHub Actions secret. The `|| true` prevents the workflow from failing if Render is briefly restarting.

---

## 15. Phase 2 Performance: Parallelize Content Generator + Template Engine

The product spec defines Content Generator and Template Engine as parallel (same input, independent outputs). The current `orchestrator.py` runs them sequentially. When Phase 2 touches `orchestrator.py` for the ThreadPoolExecutor integration, fix this:

```python
# orchestrator.py (Phase 2 change)
import concurrent.futures

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
    content_future = ex.submit(content_generator.run, intake_result)
    template_future = ex.submit(template_engine.run, intake_result)
    listing_output = content_future.result()
    verified_json_ld = template_future.result()
```

Saves ~5s per run. Do this in Phase 2 when you're already in `orchestrator.py`.

---

## 16. Cost Model (free tier limits)

| Service | Free tier | Likely usage | Risk |
|---|---|---|---|
| Render | 750h/month | ~720h (1 instance) | Render spins down after 15min idle → cold start ~10s for first run |
| Vercel | Unlimited projects, 100GB bandwidth | <1GB/month (internal tool) | None |
| Supabase | 500MB DB, 1GB storage, 50K MAU | <50MB DB, <100MB storage, <10 users | None |
| Gemini API | Context-dependent pricing | Pay per run | Not free — budget per run ~$0.02–0.05 |

**Render cold start mitigation**: configure a cron job on Render that pings `/health` every 14 minutes to keep the instance warm. Or upgrade to Render $7/month paid tier (not free, user's call).

