# Headout AI Listing Generation Pipeline — Product Log

> **Working directory**: `/Users/ihaz/Projects/list generation agent/`
> **Last updated**: 2026-05-02 (Session 4)
> **Status**: CLI pipeline complete. Frontend complete (all 6 screens, verified in browser). Backend not yet built — Phase 1 is next.

---

## The Problem

Headout signs 50+ new supplier experiences per month. Each listing currently takes 2–4 hours of manual catalog associate work: parse raw supplier data (PDFs, emails, CSVs), write all copy from scratch, structure variants, add SEO metadata, coordinate supplier clarifications, publish. At 50+ experiences/month that's 100–200 hours/month of bottlenecked catalog work.

**Goal**: An AI pipeline that removes the content production step entirely — leaving the associate with review and approval only.

---

## How to Run It

```bash
# 1. Set your API key
cp .env.example .env
# Edit .env and add: GEMINI_API_KEY=your_key_here

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the happy path demo (Dubai Desert Safari with CONDITIONAL tower access)
python3 generate_listing.py --input examples/supplier_happy_path.txt

# 4. Run the contradiction demo (same supplier, pickup time contradicted — pipeline halts)
python3 generate_listing.py --input examples/supplier_contradiction.txt

# 5. Save output to a specific file
python3 generate_listing.py --input examples/supplier_happy_path.txt --output my_listing.json
```

**What you'll see in the console:**
- Duplicate check against previously generated listings in `listings/`
- Intake Agent output: confidence level, ambiguity flags, publish-blocked status
- Auto-drafted supplier clarification email (demo — not sent)
- Copy generation and Template Engine confirmation
- Review Agent verdict: pass/conditional_pass/fail with scores and blockers
- Final listing saved to JSON; artifacts saved to `listings/{run_id}/`

---

## Complete File Inventory

### Agent Prompts (system prompts for each LLM agent)

| File | Role | Status |
|---|---|---|
| `agent_prompt_supplier_intake.md` | Intake Agent system prompt | Complete — updated 2026-05-02 |
| `agent_prompt_content_generator.md` | Content Generator system prompt | Complete |
| `agent_prompt_review.md` | Review Agent system prompt | Complete |

### Engineering Specs

| File | Contents | Status |
|---|---|---|
| `pipeline_orchestration_spec.md` | Step-by-step execution, state machine, error handling, file artifacts per run | Complete |
| `structured_data_template_engine.md` | Deterministic JSON-LD generator: field mapping rules, ISO 8601 conversion, omission policy | Complete |
| `headout_agent_transformation_spec.md` | Classification decision trees, variant strategy, pricing model, cancellation policy mapping | Complete |

### API Research

| File | Contents | Status |
|---|---|---|
| `headout_api_research_findings.md` | Full API structure: experience type enums, inventory types, product/variant/booking schemas | Complete |
| `headout_field_level_diff_analysis.md` | Field-level diff across 6 experience types; API call sequence | Complete |
| `api_json_examples.md` | Representative JSON responses per experience type | Complete |
| `api_schema_quick_reference.md` | Quick lookup table for field names and valid values | Complete |
| `headout_supplier_to_api_payload.md` | Full field-by-field mapping: supplier input → Headout API payload | Complete |
| `headout_additional_supplier_payloads.md` | 7 complete supplier payload examples | Complete |

### Product Docs

| File | Contents | Status |
|---|---|---|
| `product_overview.md` | Goal, problem, solution, workflow, and architecture in one shareable doc | Complete |
| `mvp_product_brief.md` | MVP scope, screen-by-screen workflow, pipeline map | Complete |
| `ihaz-listagent-design.md` | Office-hours design doc: problem framing, premises, architecture decisions, approaches considered | Complete |
| `cto_instructions.md` | Full CTO architecture plan: stack decisions, DB schema, API design, 8 screens, infra setup, 4-phase roadmap, test requirements | Complete — 2026-05-02 |

### Python Implementation

| File | Role | Status |
|---|---|---|
| `requirements.txt` | `google-genai`, pydantic, typer, rich, python-dotenv | Done |
| `models/intake.py` | Pydantic models: IntakeResult, IntakeMeta, AmbiguityFlag, DesignDecision | Done |
| `models/listing.py` | Pydantic models: ListingOutput, Listing, Variant, FAQ, SEO, PublishVerdict | Done |
| `models/review.py` | Pydantic models: ReviewOutput, ReviewDetail, ReviewBlocker, ReviewWarning | Done |
| `models/__init__.py` | Package exports | Done |
| `agents/intake_agent.py` | Gemini call, 2-attempt JSON retry | Done |
| `agents/content_generator.py` | Gemini call + targeted regeneration logic | Done |
| `agents/template_engine.py` | Deterministic Python: intake payload → schema.org JSON-LD | Done |
| `agents/review_agent.py` | Gemini call, auto-escalates on second review pass | Done |
| `agents/duplicate_detector.py` | difflib similarity check against `listings/` directory | Done |
| `agents/email_generator.py` | Formats ambiguity_flags → supplier clarification email draft | Done |
| `orchestrator.py` | 12-state pipeline machine, saves all artifacts per run | Done |
| `generate_listing.py` | Typer CLI with Rich console output | Done |
| `examples/supplier_happy_path.txt` | Dubai Desert Safari — clean input with CONDITIONAL tower access | Done |
| `examples/supplier_contradiction.txt` | Same supplier — pickup time contradicted (3:30 PM vs 4:00 PM) | Done |
| `.env.example` | Template: `GEMINI_API_KEY=your_key_here` | Done |

### Frontend — React + Vite + TypeScript

Located at `frontend/`. Run with `npm install && npm run dev`. Build verified (`npm run build` passes, TypeScript clean).

Design source: `experience-onboarding-agent/` bundle (Headout design system — Halyard fonts, CSS custom properties). All 6 screens verified in browser.

| File | Role | Status |
|---|---|---|
| `frontend/package.json` | React 18, lucide-react, Vite, TypeScript | Done |
| `frontend/vite.config.ts` | Vite + React plugin | Done |
| `frontend/tsconfig.json` | TypeScript config | Done |
| `frontend/public/logo.svg` | Headout logo | Done |
| `frontend/public/fonts/` | Halyard Display + Halyard Text (.otf) | Done |
| `frontend/src/index.css` | Headout design tokens: CSS custom properties, font faces, animations | Done |
| `frontend/src/types.ts` | TypeScript types: Screen, FieldData, ListingRow, ProcessData, etc. | Done |
| `frontend/src/main.tsx` | React root | Done |
| `frontend/src/App.tsx` | Screen router (dashboard → upload → processing → review → publish → published) | Done |
| `frontend/src/components/TopNav.tsx` | Nav bar: logo, "Listing Agent" label, autosave indicator, user avatar | Done |
| `frontend/src/components/StatusPill.tsx` | Ready / Caveat added / Needs review pill with hover tooltip | Done |
| `frontend/src/components/FieldComponent.tsx` | Core field: A/B/C tab switcher, inline edit, source quote popover, regenerate confirm, flag detail expander, "Raise with supplier" | Done |
| `frontend/src/pages/Dashboard.tsx` | Screen 1: listings table, status pills with flag counts, search, status filters | Done |
| `frontend/src/pages/UploadScreen.tsx` | Screen 2: paste tab + file drag-and-drop + supplier autocomplete dropdown | Done |
| `frontend/src/pages/ProcessingScreen.tsx` | Screen 3: animated stage stepper (6 stages), live progress bar, context line | Done |
| `frontend/src/pages/ReviewScreen.tsx` | Screen 4: horizontal section nav with status dots, verdict banner, supplier clarification modal, operating hours module | Done |
| `frontend/src/pages/PublishConfirm.tsx` | Screen 5: listing summary card, checklist gate (Publish disabled until all checked) | Done |
| `frontend/src/pages/PublishedScreen.tsx` | Screen 6: success state, "View on Headout" / "View in admin" links | Done |

**Design decisions made during frontend implementation:**

- No Tailwind — the Headout design system is CSS custom property–based; adding Tailwind would conflict. Used the design system tokens directly (CSS variables + inline styles), matching the prototype exactly.
- No shadcn/ui — same reason. All components built from the Headout design spec.
- Halyard fonts loaded from `public/fonts/` (bundled from the design export). No Google Fonts CDN dependency.
- `FieldComponent` is the single most-used component; it owns all field states (editing, regenerating, resolved, source-open, confirm-regen) locally — no global state needed.

### Artifacts Directory

| Path | Purpose |
|---|---|
| `listings/{run_id}/intake.json` | Intake Agent output for this run |
| `listings/{run_id}/listing.json` | Content Generator output |
| `listings/{run_id}/verified_json_ld.json` | Template Engine output (schema.org JSON-LD) |
| `listings/{run_id}/merged_listing.json` | Final merged listing (used by Review Agent) |
| `listings/{run_id}/review.json` | Review Agent verdict |
| `listings/{run_id}/merged_listing_v2.json` | Post-regen listing (if regen was triggered) |
| `listings/{run_id}/review_v2.json` | Second review verdict (if regen was triggered) |
| `listings/{run_id}/escalation_record.json` | Escalation details (if pipeline escalated to human) |

---

## Architecture

```
[Supplier Data — file or paste]
         │
         ▼
[Duplicate Detector]              difflib similarity vs listings/ directory
  ├── Duplicate found → warn associate, show similarity score
  └── No duplicate → continue
         │
         ▼
[Agent 1: Intake Agent]           Model: Gemini 2.5 Flash | Temp: 0
  Two-pass ambiguity detection:
    Pass 1: Pre-screen raw input for obvious vagueness
    Pass 2: Flag ambiguities found during field extraction
  Output: intake.json
    ├── _meta: supplier, confidence (HIGH/MEDIUM/LOW), publish_blocked
    ├── payload: full Headout API product object (dict)
    ├── _sources: field path → EXPLICIT|INFERRED|DEFAULT|AGENT-GENERATED
    ├── ambiguity_flags: [{type: ABSENT|DEFERRED|CONDITIONAL, field, resolution, action_required, blocks_publish}]
    └── design_decisions: [{decision, alternatives, reason}]
         │
         ├── [Email Generator]     Format ambiguity_flags → supplier clarification email draft
         │                         Demo only: printed to console, not sent
         │
         ▼
[Agent 2: Content Generator]      Model: Gemini 2.5 Flash | Temp: 0.7 (0.3 on regen)
  Input: intake.json
  Output: listing.json
    ├── listing: title (primary + A/B), tagline, description (short + full 4 sections),
    │           highlights (6), inclusions, exclusions, FAQs (6-8), SEO (title/meta/tags)
    ├── variants: [{name, name_ab_variant, tagline, description, key_differentiators, upsell_hook}]
    ├── ab_test_plan: {priority_test, hypothesis, metric_to_watch}
    └── publish_verdict: {ready, confidence, blockers, warnings, copy_quality_score}

[Template Engine]                 Deterministic Python — NO LLM
  Input: intake.json (same payload)
  Output: verified_json_ld.json
    └── @graph: [TourActivity, FAQPage, BreadcrumbList]
  Rules:
    • null fields are OMITTED — never placeholdered
    • duration_ms → ISO 8601 (PT#H#M)
    • start_times[] → openingHoursSpecification
    • faqs[] → FAQPage.mainEntity
         │
         ▼
[Orchestrator: merge]
  merged_listing.json = listing.json
    + structured_data.json_ld (from Template Engine — authoritative)
    + structured_data.canonical_strategy (built from variants: first=self-canonical, rest=canonical-to-primary)
         │
         ▼
[Agent 3: Review Agent]           Model: Gemini 2.5 Flash | Temp: 0
  Input: intake.json + merged_listing.json
  Three independent layers:
    Layer 1 — Factual accuracy (9 checks): every claim traces to intake data
    Layer 2 — Voice compliance (8 checks): Headout brand rules
    Layer 3 — SEO completeness (8 checks): title/meta/tags/structured data
  Output: review.json
    └── {overall: pass|conditional_pass|fail, scores, blockers, warnings,
          escalate_to_human, regeneration_scope}
         │
    ┌────┴────┐
    │         │
  PASS      FAIL
    │         │
    │   [Targeted Regeneration]
    │   Content Generator reruns ONLY failing fields (temp: 0.3)
    │   fix_instruction per blocker passed as context
    │   Passing fields explicitly marked immutable
    │         │
    │    ┌────┴────┐
    │    │         │
    │   PASS    FAIL (2nd) → always escalate_to_human: true
    │    │         │
    │    │   [Human Escalation]
    │    │   escalation_record.json saved, pipeline halts
    └────┘
         │
  [Ready for Publish]
  merged_listing.json is the deliverable
```

### Agent Specifications

| Component | Type | Model | Temperature | Input | Output |
|---|---|---|---|---|---|
| Intake Agent | LLM | Gemini 2.5 Flash | 0 | Raw supplier text | `intake.json` |
| Content Generator | LLM | Gemini 2.5 Flash | 0.7 (0.3 regen) | `intake.json` | `listing.json` |
| Template Engine | Deterministic Python | — | — | `intake.json` | `verified_json_ld.json` |
| Review Agent | LLM | Gemini 2.5 Flash | 0 | `intake.json` + `merged_listing.json` | `review.json` |
| Duplicate Detector | Python (difflib) | — | — | `intake.payload` + `listings/` dir | similarity list |
| Email Generator | Python (template) | — | — | `ambiguity_flags[]` | email draft string |

---

## Pipeline State Machine

```
pending
  → intake_in_progress
  → intake_complete
  → generation_in_progress      (Content Generator + Template Engine — sequential in demo)
  → generation_complete
  → review_in_progress
  → ready_for_publish           (pass or conditional_pass)
  → regeneration_in_progress    (targeted regen of failing fields only)
  → escalated_to_human

Terminal failure states:
  → intake_failed               (Intake Agent error after 2 retries)
  → generation_blocked          (Content Generator returned hard-stop error)
```

---

## Key Design Decisions

### 1. Three ambiguity types in agent prompt (ABSENT / DEFERRED / CONDITIONAL)

The Intake Agent classifies every non-obvious field into one of three types:

- **ABSENT**: Supplier didn't mention it. Is absence plausible for this experience type? If yes → set to `[]` or `false` with reason. If no → `null` + flag.
- **DEFERRED**: Supplier acknowledged it exists but won't specify ("contact us for details"). → `null` in payload + soft customer-facing language in `importantInformation[]`.
- **CONDITIONAL**: Included but not guaranteed ("not guaranteed", "weather permitting"). → listed in inclusions WITH explicit conditional language + dedicated FAQ + `blocks_publish: true` if no refund policy defined.

**The critical rule**: `[]` means "none exist." `null` means "we don't know." Never confuse these.

The `_sources` field tracks confidence per field (EXPLICIT / INFERRED / DEFAULT / AGENT-GENERATED) separately from the ambiguity flags. This separation exists because source tracking (which fields did the agent infer?) and ambiguity flagging (which fields need human attention?) are different concerns.

### 2. Schema: Pydantic models follow the agent prompt, not the design doc

`models/intake.py` was originally written to match the design doc's schema (IntakeField wrappers per field, 5-state ConfidenceState enum). The agent prompt evolved into a different structure (full Headout API payload + `_sources` + `ambiguity_flags`). The model was rewritten to match the agent — the agent prompt is the ground truth.

If you're adding new intake fields: add them to the agent prompt first, then update the downstream models and template engine field mappings.

### 3. Template Engine never invents

If a field is `null` or missing in the intake payload, it is **omitted** from the JSON-LD output — never replaced with a placeholder. The `_sources` dict tells the Review Agent which fields were `INFERRED` so it can check them independently.

### 4. Review Agent never sees Content Generator instructions

It evaluates against two fixed references only: `intake.json` (facts) and hardcoded voice rules (quality). This eliminates self-grading: a model cannot be a reliable judge of its own output.

### 5. Targeted regeneration, not full reruns

On FAIL: the orchestrator builds a regen prompt containing:
- Full `intake.json` (unchanged)
- Previous full listing with passing fields explicitly marked as immutable
- Only the failing fields with their `fix_instruction`
- Temperature drops from 0.7 → 0.3

Second review fail always sets `escalate_to_human: true` regardless of the severity.

### 6. Duplicate detection is local-only

The detector checks `listings/` — previously generated runs stored on this machine. It uses `difflib.SequenceMatcher` on `"{productName} {city}"` fingerprints with an 0.82 similarity threshold. No vector index, no connection to the Headout catalog. Sufficient to prevent running the pipeline twice on the same supplier input during development.

### 7. Supplier email is a demo artefact

The email generator formats `ambiguity_flags` (specifically ABSENT and DEFERRED types) into a professional clarification email. It is printed to the console — no SMTP, no sending. In production this would connect to an email service, but the content (the questions) is already correct.

---

## Headout Voice Rules (Review Agent Layer 2)

Baked into `agent_prompt_content_generator.md` and `agent_prompt_review.md`. Quick reference:

1. **Lead with action, not description** — "Zip up the world's fastest elevator" not "The Burj Khalifa is a skyscraper"
2. **Second person throughout** — "you" and "your"; never "visitors", "guests", "travelers"
3. **Specific numbers over vague superlatives** — "452 meters" not "amazing heights"
4. **Problem → solution framing** — "Save your time by bypassing the notorious queue" not "Skip-the-line access included"
5. **Section headers tease content, never label** — "Reach the top in under a minute" not "About this experience"
6. **Exactly 6 highlights, each 10–15 words** — each starts with a different verb, contains one concrete fact
7. **Banned openers** — "Embark on", "Welcome to", "Discover the magic of", "Experience the wonder of"
8. **No variant named "Option", "Package", "Plan", "Tier"** — name what the customer gets
9. **No "this option includes" in variant descriptions**
10. **FAQs written as real customers would ask** — "Do I need to print my ticket?" not "What are the ticket redemption instructions?"

---

## What's NOT in Scope (deferred, not cancelled)

| Feature | Reason deferred |
|---|---|
| Rosetta translation trigger | Requires Headout internal API access, fires post-publish |
| 30-day performance loop + GSC data | Requires live listing + analytics access |
| Duplicate detection vs full Headout catalog | No catalog API access; pgvector upgrade deferred to Phase 2+ |
| Supplier clarification form + auto-resolve | Requires SMTP + form hosting + webhook; demo email only for now |
| A/B test publishing | JSON plan is produced; actual variant split testing is Headout infra |
| pgvector semantic duplicate detection | Phase 1 keeps difflib; Gemini embedding-001 wired up post-MVP |
| Signed upload URLs for images | Proxying through FastAPI accepted as MVP simplification |
| Async rewrite of orchestrator.py | ThreadPoolExecutor bridge sufficient; async rewrite is Phase 3+ |
| Bulk CSV ingestion | After single-listing workflow proven |
| Supplier self-serve portal | Separate product track |

---

## What's Left to Build

The CLI pipeline runs end-to-end. The web layer architecture is decided. Build order:

### Phase 1 — Backend skeleton (2–3 days)

| Component | Notes |
|---|---|
| `backend/main.py` | FastAPI app, CORS, health endpoint |
| `backend/config.py` | Env vars via pydantic-settings |
| `backend/dependencies.py` | Supabase JWT validation → `get_current_user` |
| `backend/routers/runs.py` | POST /runs, GET /runs/:id (single JOIN), PATCH fields |
| `backend/services/supabase_service.py` | `supabase_write_with_retry()` — 3-attempt retry + filesystem fallback |
| `supabase/migrations/001_initial_schema.sql` | runs, run_artifacts, run_images, listings tables + RLS on all 4 |
| `.github/workflows/keep-warm.yml` | Cron ping every 14 min to prevent Render cold start |
| `tests/test_cli.py` | 4 pipeline invariant tests (no Supabase required) |

### Phase 2 — Pipeline integration (2–3 days)

| Component | Notes |
|---|---|
| `backend/services/pipeline_service.py` | ThreadPoolExecutor bridge (sync orchestrator → async FastAPI). Status queue → Supabase Realtime |
| Wire POST /runs to background task | Gemini timeout + all exceptions → `generation_blocked` state |
| POST /runs/:id/regenerate | Targeted section regen endpoint |
| POST /runs/:id/images | Image upload (proxied through FastAPI for MVP) |
| Escalation persistence | On second Review Agent fail: write to `run_artifacts` table (type: escalation_record) |
| Content Generator parallelisation | `concurrent.futures.ThreadPoolExecutor` for Generator + Template Engine in `orchestrator.py` |
| `backend/tests/test_pipeline_service.py` | Gemini timeout, Supabase write retry, escalation persistence |
| `backend/tests/test_auth.py` | JWT validation, RLS cross-user isolation |

### Phase 3 — Frontend ✅ COMPLETE (Session 4)

All 6 screens built, verified in browser, production build passing. See "Frontend — React + Vite + TypeScript" in the File Inventory above for full details.

**Remaining frontend work (connects to real API — Phase 2 prerequisite):**

| Component | Notes |
|---|---|
| Replace mock data in Dashboard | Wire to `GET /api/v1/runs` once backend exists |
| Replace mock data in ReviewScreen | Wire to `GET /api/v1/runs/:id/artifacts/merged_listing` |
| Type codegen | `openapi-typescript` from FastAPI's `/openapi.json` → `src/lib/types.ts` (once backend exists) |
| Supabase Realtime subscriptions | ProcessingScreen and ReviewScreen progress (Phase 2) |
| Login screen | Supabase Auth email/password (Phase 4) |
| `frontend/e2e/` Playwright tests | Happy path + CONTRADICTED + escalation UI (Phase 4) |

### Phase 4 — Auth + hardening + deploy (1–2 days)

| Component | Notes |
|---|---|
| Login screen | Supabase Auth (email/password) |
| Error boundaries on every screen | Clear error states, Retry button for `generation_blocked` runs |
| Full deploy | Render (backend) + Vercel (frontend) with env vars |

### Ongoing (not blocking)

| Component | Priority | Notes |
|---|---|---|
| Tests: 4 CLI invariants | High | CONTRADICTED halt, regen immutability, CONDITIONAL blocks_publish, null≠[] |
| Error handling for API timeouts | High | Gemini `DeadlineExceeded` → `generation_blocked` state (Phase 2) |
| Prompt caching | Medium | Gemini `cachedContent` API can cache large system prompts |
| Rosetta integration | Post-MVP | Trigger after `ready_for_publish`; requires Headout internal API access |

---

## Configuration

```json
{
  "model": "gemini-2.5-flash",
  "temperature": {
    "intake": 0,
    "content_generator": 0.7,
    "content_generator_regen": 0.3,
    "review": 0
  },
  "timeouts_ms": {
    "intake": 60000,
    "content_generator": 90000,
    "template_engine": 5000,
    "review": 60000
  },
  "max_retries": {
    "malformed_json": 2,
    "regeneration_attempts": 1
  },
  "duplicate_detection": {
    "threshold": 0.82,
    "store": "listings/"
  }
}
```

---

## Session History

### Session 4 — Frontend Implementation (2026-05-02)

Implemented the full frontend from the Headout design export (`experience-onboarding-agent/` bundle). The design bundle contained: a Listing Agent HTML prototype (React 18 + Babel + Lucide, 6 screens), the Headout design system CSS (`colors_and_type.css` — CSS custom properties, Halyard fonts), the Headout design spec (`listing_agent_design_spec.md`), and the Halyard Display + Halyard Text font files.

**Approach:** Converted the single-file HTML prototype into a proper React + Vite + TypeScript project. Kept the Headout design system CSS (custom properties) rather than Tailwind — the design is token-based, and Tailwind would conflict. Skipped shadcn/ui for the same reason; all components built to spec.

**All 6 screens implemented and browser-verified:**

1. **Dashboard** — listings table, per-row status pills (with flag counts), search bar, status filter pills, "New listing" CTA
2. **Upload** — primary "From message or email" paste tab (with character-count feedback) + "Upload documents" file drag-and-drop tab, supplier autocomplete dropdown (search-in-dropdown pattern), experience name field, disabled Process CTA until input present
3. **Processing** — 6-stage animated stepper, live progress bar, contextual status line per stage, auto-advances to review on completion
4. **Review** (main screen) — horizontal section nav with color-coded status dots, amber verdict banner with expandable flag list, supplier clarification modal (with success state), operating hours module table, source files panel at bottom. Every field uses `FieldComponent`:
   - A/B/C tab switcher (title and description hook only)
   - Inline edit with Save / Cancel / Esc-to-revert
   - Source quote popover
   - Regenerate with confirmation dialog
   - "Why this needs review" expander with "Update manually" and "Raise with supplier" actions
   - Status: resolved → pill flips to Ready, flag count decrements, banner progress bar advances
5. **Publish confirmation** — listing summary card, 3-item checklist (Publish CTA stays disabled until all checked)
6. **Published** — success state, "View on Headout" and "View in admin" links, "Process another listing" CTA

**Key component: `FieldComponent`**

Owns all field-level state locally: editing, regenerating, tab-selected, source-open, confirm-regen, resolved. No global state. When a field is saved or resolved, `onResolve()` callback fires to the parent (ReviewScreen), which decrements the flag counter and updates the section nav dot colour. The A/B/C tabs collapse to a "Show alternatives" link after a manual edit (to avoid overwriting the edit).

**Build status:** `npm run build` passes, `tsc --noEmit` clean, 0 TypeScript errors.

---

### Session 1 — Design + Research (2026-05-01 / 05-02)

Built all design and spec documents. Ran the office-hours design session which produced `ihaz-listagent-design.md`. Key outcome from that session: revised ambiguity detection from a pre-classification approach to two-pass extraction-time detection. Scaffolded `models/intake.py`, `requirements.txt`, and empty directory structure.

### Session 3 — Web Layer Architecture (2026-05-02)

Ran `/plan-eng-review` to decide the backend, database, and frontend stack for the web application layer. Output: `cto_instructions.md` — a full CTO-level architecture document.

**Stack decisions confirmed (D1–D3):**
- Backend: Python + FastAPI (natural fit — all agent code is Python + Pydantic, zero rewrite)
- Database: Supabase free tier (PostgreSQL + pgvector + Auth + 1GB Storage + Realtime in one package)
- Frontend: React + Vite + TypeScript + Tailwind + shadcn/ui, deployed to Vercel free tier

**Architecture issues resolved in review:**
1. **RLS gap**: RLS must be enabled on all 4 tables (`runs`, `run_artifacts`, `run_images`, `listings`), not just `runs`. Added to migration.
2. **Sync/async bridge**: `orchestrator.py` is sync; FastAPI is async. Injecting an async callback deadlocks. Fix: `run_in_executor(ThreadPoolExecutor)` + thread-safe Queue for status updates. No rewrite of `orchestrator.py` needed.
3. **Background task failure**: FastAPI background tasks swallow exceptions silently. Fix: try/except in `pipeline_service.py` → write `generation_blocked` state.
4. **Supabase write retry**: If a DB write fails mid-pipeline, `runs.status` gets stuck. Fix: `supabase_write_with_retry()` with 3-attempt retry + filesystem fallback (build in Phase 1).
5. **Render cold start**: Free tier spins down after 15 min. Fix: GitHub Actions cron job pings `/health` every 14 minutes.
6. **Type drift**: Pydantic models would be duplicated as TypeScript types. Fix: `openapi-typescript` codegen from FastAPI's `/openapi.json` — types are never hand-written.
7. **N+1 on artifacts**: `GET /runs/:id` uses a single JOIN query, not 8 round trips.
8. **Escalation persistence**: When Review Agent fails twice, escalation record must be written to `run_artifacts` table (Phase 2 — required, not deferrable).
9. **pgvector deferred**: Phase 1 keeps `difflib` for duplicate detection. pgvector with Gemini embedding-001 is a Phase 2+ upgrade.
10. **Content Generator parallelisation**: Template Engine + Content Generator to run concurrently via `concurrent.futures` — fix in Phase 2 when `orchestrator.py` is touched.

**Build order decided**: Phase 1 (backend skeleton + Supabase) → Phase 2 (pipeline integration) → Phase 3 (8-screen frontend) → Phase 4 (auth + deploy). See `cto_instructions.md` for full detail.

---

### Session 2 — Engineering Review + Full Implementation (2026-05-02)

Ran `/plan-eng-review` against `mvp_product_brief.md`. Key findings:

**Two blocking issues resolved before writing any code:**

1. **Schema mismatch (D1)**: `models/intake.py` was written against the design doc's schema (`IntakeField` wrappers, 5-state `ConfidenceState` enum). The agent prompt evolved into a different structure (`_meta + payload + _sources + ambiguity_flags`). Decision: rewrite the Pydantic models to follow the agent prompt. Agent prompt is ground truth.

2. **Model provider (D2)**: `requirements.txt` had `anthropic>=0.40.0` but all specs specified Gemini 2.5 Flash. Decision: keep Gemini — swap `anthropic` for `google-genai`.

**Additional issues fixed:**
- `agent_prompt_supplier_intake.md`: replaced illegal JSON `// SOURCE:` comments with a proper `_sources` dict field
- Confidence state vocabulary standardised across all files
- Scope clarified: duplicate detection is local-only; supplier email is demo/display only

**Implemented:**
All 13 Python files written. Pipeline runs end-to-end. Both demo inputs ready. All files pass syntax check.

---

## Open Questions

| Question | Owner | Blocks |
|---|---|---|
| Gemini 2.5 Flash API key — which account, which project? | ihaz | Phase 1 — backend won't run without it |
| Render vs Railway for backend hosting? | ihaz | Phase 1 — Railway has $5/month cap then paid; Render is 750h/month truly free |
| Target languages per city for Rosetta trigger? | Localization team | Phase 3 Approval screen |
| Image minimum spec (resolution, aspect ratio, count) | Design/product | Phase 3 Image Upload screen |
| Supplier clarification form: Headout-hosted or Typeform/Tally? | Engineering | Phase 3 — email generator points to form URL |
| Underperformance threshold for Mode 2 auto-flag | Data/analytics team | Post-MVP |
| Canonical source for duplicate detection (full catalog API) | Engineering | Post-MVP pgvector upgrade |

**Resolved this session:**

| Question | Decision |
|---|---|
| Backend language | Python + FastAPI (existing code is Python + Pydantic — zero rewrite) |
| Database | Supabase free tier (PostgreSQL + pgvector + Auth + Storage + Realtime) |
| Frontend framework | React + Vite + TypeScript + Tailwind + shadcn/ui, deployed to Vercel |
| Timeout + backoff strategy | try/except in pipeline_service.py → `generation_blocked` state + `supabase_write_with_retry()` |
