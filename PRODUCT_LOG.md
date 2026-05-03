# Headout AI Listing Generation Pipeline — Product Log

> **Working directory**: `/Users/ihaz/Projects/list generation agent/`
> **Last updated**: 2026-05-04 (Session 14)
> **Status**: CLI pipeline complete and **verified end-to-end with OpenAI**. Frontend complete (all 6 screens, wired to real API, **deployed to Vercel**). Backend complete (Phases 1–2), **deployed to Render**. Full production stack live. Review Agent recalibrated — false positives fixed, blockers now routed as `regenerate` vs `associate_action` so the orchestrator only auto-regens content quality issues; supplier/manual items surface directly to the associate. **Frontend: https://headout-listing-agent.vercel.app | Backend: https://headout-listgenerationagent.onrender.com**
> **Repo**: https://github.com/aiihaz/headout-listgenerationagent (default branch: `staging`)

---

## The Problem

Headout signs 50+ new supplier experiences per month. Each listing currently takes 2–4 hours of manual catalog associate work: parse raw supplier data (PDFs, emails, CSVs), write all copy from scratch, structure variants, add SEO metadata, coordinate supplier clarifications, publish. At 50+ experiences/month that's 100–200 hours/month of bottlenecked catalog work.

**Goal**: An AI pipeline that removes the content production step entirely — leaving the associate with review and approval only.

---

## How to Run It

```bash
# 1. Set your API key
cp .env.example .env
# Edit .env and add: OPENAI_API_KEY=your_key_here
# Optional: override OPENAI_MODEL / OPENAI_INTAKE_MODEL / OPENAI_CONTENT_MODEL / OPENAI_REVIEW_MODEL

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
| `agent_prompt_review.md` | Review Agent system prompt; Layer 1 scope tightened (description prose not checked against intake field values); SEO title vs `productName` false positive excluded; editorial FAQs excluded from factual mismatch checks; `action_required: regenerate\|associate_action` field added to blocker schema with routing rules | Complete — updated 2026-05-04 |

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
| `requirements.txt` | `openai`, pydantic, typer, rich, python-dotenv | Done |
| `models/intake.py` | Pydantic models: IntakeResult, IntakeMeta, AmbiguityFlag, DesignDecision | Done |
| `models/listing.py` | Pydantic models: ListingOutput, Listing, Variant, FAQ (+ `paa_source`), SEO, PublishVerdict; `_coerce_str_to_list` validator on all `list[str]` fields; `CopyQualityScore` fields and `copy_quality_score` made optional with defaults | Done — updated 2026-05-03 |
| `models/review.py` | Pydantic models: ReviewOutput, ReviewDetail, ReviewBlocker, ReviewWarning; `action_required: Optional[str] = "regenerate"` added to `ReviewBlocker` | Done — updated 2026-05-04 |
| `models/serper.py` | Pydantic models: SerperContext, SerperOrganic | Done — 2026-05-03 |
| `models/__init__.py` | Package exports — includes SerperContext, SerperOrganic | Done — updated 2026-05-03 |
| `agents/llm_client.py` | Shared OpenAI Responses API JSON helper; default/per-agent model env vars; default model corrected to `gpt-4o-mini` | Done — 2026-05-03 |
| `agents/intake_agent.py` | OpenAI Responses API call, 2-attempt JSON retry | Done |
| `agents/serper_agent.py` | LLM query gen (temp 0) + Serper API call + graceful degrade on all failure modes (blank key, timeout, 401, 429, bad JSON) | Done — 2026-05-03 |
| `agents/content_generator.py` | OpenAI Responses API call + targeted regen logic; accepts `serper_context` and builds SEO Research Context section in user prompt | Done — updated 2026-05-03 |
| `agents/template_engine.py` | Deterministic Python: intake payload → schema.org JSON-LD | Done |
| `agents/review_agent.py` | OpenAI Responses API call, auto-escalates on second review pass; accepts `serper_context` and injects keyword signal / skip note | Done — updated 2026-05-03 |
| `agents/duplicate_detector.py` | difflib similarity check against `listings/` directory | Done |
| `agents/email_generator.py` | Formats ambiguity_flags → supplier clarification email draft | Done |
| `orchestrator.py` | 15-state pipeline machine, saves all artifacts per run; serper step between intake and generation; splits Review Agent blockers by `action_required` — only `regenerate` blockers trigger targeted regen, `associate_action` blockers surface to associate without regen round-trip | Done — updated 2026-05-04 |
| `generate_listing.py` | Typer CLI with Rich console output | Done |
| `examples/supplier_happy_path.txt` | Dubai Desert Safari — clean input with CONDITIONAL tower access | Done |
| `examples/supplier_contradiction.txt` | Same supplier — pickup time contradicted (3:30 PM vs 4:00 PM) | Done |
| `.env.example` | Template: `OPENAI_API_KEY=your_key_here`, default model overrides | Done |

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
| `frontend/src/types.ts` | TypeScript types: Screen, FieldData, ListingRow, ProcessData, RunStatus (includes `serper_in_progress`, `serper_complete`, `serper_skipped`), etc.; `ReviewBlocker.action_required: 'regenerate' \| 'associate_action'`; `FieldData.action` added | Done — updated 2026-05-04 |
| `frontend/src/main.tsx` | React root | Done |
| `frontend/src/App.tsx` | Screen router (dashboard → upload → processing → review → publish → published) | Done |
| `frontend/src/components/TopNav.tsx` | Nav bar: logo, "Listing Agent" label, autosave indicator, user avatar | Done |
| `frontend/src/components/StatusPill.tsx` | Ready / Caveat added / Needs review pill with hover tooltip | Done |
| `frontend/src/components/FieldComponent.tsx` | Core field: A/B/C tab switcher, inline edit, source quote popover, regenerate confirm, flag detail expander; always shows both "Update manually" and "Raise with supplier" — associate chooses whichever fits their context | Done — updated 2026-05-04 |
| `frontend/src/pages/Dashboard.tsx` | Screen 1: listings table, status pills with flag counts, search, status filters | Done |
| `frontend/src/pages/UploadScreen.tsx` | Screen 2: paste tab + file drag-and-drop + supplier autocomplete dropdown | Done |
| `frontend/src/pages/ProcessingScreen.tsx` | Screen 3: animated stage stepper (6 stages), live progress bar, context line; stage 2 updated to "Researching search landscape" covering serper states | Done — updated 2026-05-03 |
| `frontend/src/pages/ReviewScreen.tsx` | Screen 4: horizontal section nav with status dots, verdict banner, supplier clarification modal, operating hours module | Done |
| `frontend/src/pages/PublishConfirm.tsx` | Screen 5: listing summary card, checklist gate (Publish disabled until all checked) | Done |
| `frontend/src/pages/PublishedScreen.tsx` | Screen 6: success state, "View on Headout" / "View in admin" links | Done |

**Design decisions made during frontend implementation:**

- No Tailwind — the Headout design system is CSS custom property–based; adding Tailwind would conflict. Used the design system tokens directly (CSS variables + inline styles), matching the prototype exactly.
- No shadcn/ui — same reason. All components built from the Headout design spec.
- Halyard fonts loaded from `public/fonts/` (bundled from the design export). No Google Fonts CDN dependency.
- `FieldComponent` is the single most-used component; it owns all field states (editing, regenerating, resolved, source-open, confirm-regen) locally — no global state needed.

### Backend — FastAPI (Phase 2)

Located at `backend/`. Run with `uvicorn backend.main:app --reload`. Requires no Supabase config to start — filesystem fallback is active by default.

| File | Role | Status |
|---|---|---|
| `backend/services/pipeline_service.py` | ThreadPoolExecutor bridge: `launch_pipeline` and `launch_regeneration` run sync orchestrator in a thread; passes `SERPER_API_KEY` to orchestrator; loads `serper_context.json` for manual regen; `serper_context` added to artifact list. `save_image` persists uploads to Supabase Storage or filesystem. | Done — updated 2026-05-03 |
| `backend/tests/__init__.py` | Package marker | Done |
| `backend/tests/test_pipeline_service.py` | 3 backend invariant tests (no Supabase, no OpenAI key required) — all passing | Done — 2026-05-03 |
| `backend/tests/test_serper_agent.py` | 9 Serper agent tests: blank key skip, timeout skip, 401 skip, 429 skip, bad JSON skip, PAA parse, pipeline-continues-on-skip, output format unchanged when skipped, review prompt omits check 9 when skipped | Done — 2026-05-03 |

**Changes to existing files:**
- `backend/routers/runs.py` — `POST /api/v1/runs` now fires `launch_pipeline` as a `BackgroundTask`; added `POST /runs/:id/regenerate` (targeted section regen) and `POST /runs/:id/images` (file upload)
- `orchestrator.py` — accepts optional `run_id` and `status_callback` params; Content Generator + Template Engine now run in parallel via `ThreadPoolExecutor`; `_notify()` helper calls callback at every state transition

**Sync/async bridge pattern:**
```
FastAPI (async) → BackgroundTask → launch_pipeline (async)
  └── loop.run_in_executor(ThreadPoolExecutor) → _sync_pipeline (sync thread)
        └── orchestrator.run(..., status_callback=on_status)
              └── on_status() → status_q.put((state, error))   [thread-safe Queue]
  └── _drain_status() (async coroutine, event loop)
        └── loop.run_in_executor(None, status_q.get) → update_run_status()
```

**Test results:** `7 passed in 2.17s` — no Supabase or OpenAI API key required.

### Backend — FastAPI (Phase 1)

Located at `backend/`. Run with `uvicorn backend.main:app --reload`. Requires no Supabase config to start — filesystem fallback is active by default.

| File | Role | Status |
|---|---|---|
| `backend/main.py` | FastAPI app, CORS middleware, `/health` endpoint | Done — 2026-05-02 |
| `backend/config.py` | `pydantic-settings`: `OPENAI_API_KEY`, OpenAI model overrides, `SERPER_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ALLOWED_ORIGINS` | Done — updated 2026-05-03 |
| `backend/dependencies.py` | `get_current_user`: Supabase JWT validation; dev passthrough when Supabase not configured | Done |
| `backend/routers/runs.py` | `POST /api/v1/runs`, `GET /api/v1/runs/:id`, `PATCH /api/v1/runs/:id/fields` | Done |
| `backend/services/supabase_service.py` | `supabase_write_with_retry()` — 3-attempt retry + filesystem fallback; `insert_run`, `update_run_status`, `write_artifact`, `get_run_with_artifacts`, `resolve_field` | Done |
| `supabase/migrations/001_initial_schema.sql` | `runs`, `run_artifacts`, `run_images`, `listings` tables + RLS on all 4 + `updated_at` trigger | Done |
| `.github/workflows/keep-warm.yml` | Cron ping `/health` every 14 min — prevents Render free-tier cold starts | Done |
| `tests/__init__.py` | Package marker | Done |
| `tests/test_cli.py` | 4 pipeline invariant tests (no Supabase or OpenAI API key required) — all passing | Done |

**Dev mode behaviour:** If `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are blank, the app runs without a database. `insert_run` writes a JSON file to `listings/{run_id}/runs_write.json`. `get_run_with_artifacts` reads from `listings/{run_id}/`. All endpoints respond normally.

**Phase 1 done when:** `curl -X POST .../api/v1/runs` returns a `run_id` — verified locally (`{"run_id":"734f8da0-...","status":"pending"}`). ✓

**Existing fix (same session):** `agents/email_generator.py` used `str | None` union syntax (Python 3.10+). Fixed to `Optional[str]` for Python 3.9 compatibility.

---

### Artifacts Directory

| Path | Purpose |
|---|---|
| `listings/{run_id}/intake.json` | Intake Agent output for this run |
| `listings/{run_id}/serper_context.json` | Serper SEO research result (always written — `{skipped: true}` if key blank or call failed) |
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
[Agent 1: Intake Agent]           Model: OpenAI gpt-4o-mini | Responses API JSON mode
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
[Serper SEO Agent]                Google SERP research (graceful degrade — never blocks)
  Input: intake.payload → LLM generates search query (temp 0)
  API: https://google.serper.dev/search (X-API-KEY header)
  Output: serper_context.json
    ├── organic[]: top competitor titles + snippets
    ├── paa[]: People Also Ask questions → FAQ seeds
    └── related_searches[]: tag candidates
  Failure modes → SerperContext(skipped=True): blank key, timeout, 401, 429, bad JSON
  States: serper_in_progress → serper_complete | serper_skipped
         │
         ▼
[Agent 2: Content Generator]      Model: OpenAI gpt-4o-mini | Responses API JSON mode
  Input: intake.json + serper_context (when available)
  Output: listing.json
    ├── listing: title (primary + A/B), tagline, description (short + full 4 sections),
    │           highlights (6), inclusions, exclusions, FAQs (7-8), SEO (title/meta/tags)
    ├── variants: [{name, name_ab_variant, tagline, description, key_differentiators, upsell_hook}]
    ├── ab_test_plan: {priority_test, hypothesis, metric_to_watch}
    └── publish_verdict: {ready, confidence, blockers, warnings, copy_quality_score}

[Template Engine]                 Deterministic Python — NO LLM
  Input: intake.json (same payload)
  Output: verified_json_ld.json
    └── @graph: [TourActivity, FAQPage, BreadcrumbList]
  Rules:
    • null fields are OMITTED — never placeholdered
    • duration (ms) → ISO 8601 (PT#H#M)
    • startTimes[] → openingHoursSpecification
    • faqs[] → FAQPage.mainEntity
    • FAQPage rebuilt from listing FAQs after merge (keeps JSON-LD in sync with generated copy)
         │
         ▼
[Orchestrator: merge]
  merged_listing.json = listing.json
    + structured_data.json_ld (from Template Engine — authoritative)
    + structured_data.canonical_strategy (built from variants: first=self-canonical, rest=canonical-to-primary)
         │
         ▼
[Agent 3: Review Agent]           Model: OpenAI gpt-4o-mini | Responses API JSON mode
  Input: intake.json + merged_listing.json
  Three independent layers:
    Layer 1 — Factual accuracy (9 checks): every claim traces to intake data
    Layer 2 — Voice compliance (8 checks): Headout brand rules
    Layer 3 — SEO completeness (8 checks + check 9 conditional): title/meta/tags/structured data
      Check 9 (conditional): if serper_context present and not skipped → primary keyword from organic[0] present in title?
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
| Intake Agent | LLM | OpenAI `gpt-4o-mini` | Reasoning low; JSON mode | Raw supplier text | `intake.json` |
| Content Generator | LLM | OpenAI `gpt-4o-mini` | Reasoning low; JSON mode | `intake.json` | `listing.json` |
| Template Engine | Deterministic Python | — | — | `intake.json` | `verified_json_ld.json` |
| Review Agent | LLM | OpenAI `gpt-4o-mini` | Reasoning low; JSON mode | `intake.json` + `merged_listing.json` | `review.json` |
| Duplicate Detector | Python (difflib) | — | — | `intake.payload` + `listings/` dir | similarity list |
| Email Generator | Python (template) | — | — | `ambiguity_flags[]` | email draft string |

---

## Pipeline State Machine

```
pending
  → intake_in_progress
  → intake_complete
  → serper_in_progress          (Serper SERP research — always runs)
  → serper_complete             (Serper call succeeded)
  → serper_skipped              (blank key, timeout, 401, 429, bad JSON — pipeline continues)
  → generation_in_progress      (Content Generator + Template Engine — parallel)
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
6. **Exactly 6 highlights, each 2–8 words** — each starts with a different verb, contains one concrete fact
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

### Phase 1 — Backend skeleton ✅ COMPLETE (Session 6)

All 8 components built, all 4 CLI tests passing, uvicorn smoke-tested locally. See "Backend — FastAPI (Phase 1)" in the File Inventory above for full detail.

### Phase 2 — Pipeline integration ✅ COMPLETE (Session 7)

All components built, 7 tests passing. See "Backend — FastAPI (Phase 2)" in the File Inventory above for full detail.

**Remaining (deferred to Phase 4):**

| Component | Notes |
|---|---|
| `backend/tests/test_auth.py` | JWT validation, RLS cross-user isolation — Phase 4 with auth wiring |

### Phase 3 — Frontend ✅ COMPLETE (Session 4)

All 6 screens built, verified in browser, production build passing. See "Frontend — React + Vite + TypeScript" in the File Inventory above for full details.

**Remaining frontend work:**

| Component | Status | Notes |
|---|---|---|
| Replace mock data in Dashboard | ✅ Done (Session 9) | Wired to `GET /api/v1/runs` |
| Replace mock data in ReviewScreen | ✅ Done (Session 9) | Wired to `GET /api/v1/runs/:id` + mapper |
| Login screen | ✅ Done (Session 9) | Supabase Auth email/password |
| Error boundaries | ✅ Done (Session 9) | `ErrorBoundary` component |
| Type codegen | Deferred | `openapi-typescript` from FastAPI `/openapi.json` — can add when API stabilizes |
| Supabase Realtime subscriptions | Deferred | ProcessingScreen uses polling (2.5s); Realtime is a Phase 4+ upgrade |
| `frontend/e2e/` Playwright tests | Deferred | Happy path + CONTRADICTED + escalation UI — Phase 4+ |

### Phase 4 — Auth + hardening + deploy

| Component | Status | Notes |
|---|---|---|
| Login screen | ✅ Done (Session 9) | `LoginScreen.tsx` — Supabase Auth email/password |
| Error boundaries on every screen | ✅ Done (Session 9) | `ErrorBoundary` wraps all screens in `App.tsx` |
| Frontend API wiring (all 6 screens) | ✅ Done (Session 9) | Upload, Processing, Dashboard, Review wired to real API |
| Frontend deploy — Vercel | ✅ Done (Session 12) | https://headout-listing-agent.vercel.app |
| Backend deploy — Render | ✅ Done (Session 14) | https://headout-listgenerationagent.onrender.com — all env vars set; `VITE_API_URL` pointed at Render; health confirmed `{"status":"ok"}` |
| Supabase migration — production | ✅ Done (Session 14) | `001_initial_schema.sql` applied; serper states + `serper_context` artifact type added; `model` column default corrected to `gpt-4o-mini` |

### Ongoing (not blocking)

| Component | Priority | Notes |
|---|---|---|
| Tests: 4 CLI invariants | High | CONTRADICTED halt, regen immutability, CONDITIONAL blocks_publish, null≠[] |
| Error handling for API timeouts | High | OpenAI SDK exceptions → `generation_blocked` state (Phase 2) |
| Prompt caching | Medium | Evaluate Responses API prompt caching once traffic patterns are clearer |
| Rosetta integration | Post-MVP | Trigger after `ready_for_publish`; requires Headout internal API access |

---

## Configuration

```json
{
  "model": "gpt-4o-mini",
  "api": "OpenAI Responses API",
  "reasoning": {
    "intake": "low",
    "content_generator": "low",
    "content_generator_regen": "low",
    "review": "low"
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

### Session 14 — Production Deploy + Review Agent Recalibration (2026-05-04)

Completed full production deploy across all three services and fixed a systematic false-positive escalation bug in the Review Agent.

**Production deploy:**
- Supabase: applied corrective migration adding `serper_in_progress`, `serper_complete`, `serper_skipped` to the `runs.status` CHECK constraint; added `serper_context` to `run_artifacts.type` CHECK constraint; corrected `model` column default from `gemini-2.5-flash` to `gpt-4o-mini`
- Render: backend deployed at https://headout-listgenerationagent.onrender.com — all env vars set (`OPENAI_API_KEY`, `SERPER_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ALLOWED_ORIGINS`); health endpoint confirmed live
- Vercel: `VITE_API_URL` set to Render URL; frontend redeployed; full stack confirmed end-to-end

**Review Agent false positive fix (`agent_prompt_review.md`):**

Root cause: the first live smoke test escalated to human (`escalated_to_human`) on a clean Dubai Desert Safari input. Four blockers were returned — three were false positives:
- B001: description prose flagged as `factual_mismatch` because it used more words than the intake field value. Not a factual error.
- B002: SEO title flagged because it differed from intake `productName`. No rule requires SEO title to match `productName`.
- B004: editorial FAQ (`"morning vs evening safari?"`) flagged as mismatch against an unrelated intake FAQ entry.

Fixes applied to `agent_prompt_review.md`:
- Layer 1 intro strengthened: checks catch specific wrong values, not prose style differences
- Section 1.3 scope restricted to `listing.inclusions[]` and FAQ answers only — description body prose explicitly excluded
- "What NOT to Flag" section expanded with three new explicit exclusions: description elaboration, SEO title wording, editorial FAQs

**Blocker action routing (`models/review.py`, `orchestrator.py`, frontend):**

Introduced `action_required: "regenerate" | "associate_action"` field on every Review Agent blocker:
- `regenerate` — content quality issue the model can fix by rewriting; orchestrator auto-regenerates
- `associate_action` — requires human decision (missing/ambiguous intake data); surfaces to associate without triggering a regen round-trip

Orchestrator updated to split blockers by `action_required` before deciding whether to run targeted regeneration. If all blockers are `associate_action`, the run moves to `ready_for_publish` immediately and the associate resolves them via the Review Screen. Second regen pass also checks for remaining `regenerate` blockers before escalating.

Frontend: `ReviewBlocker.action_required` and `FieldData.action` added to types; `mapRunToReviewData.ts` propagates `action` to every field; `FieldComponent` always shows both "Update manually" and "Raise with supplier" — associate picks whichever fits their context.

**Files modified:**
- `agent_prompt_review.md` — Layer 1 scope, "What NOT to Flag", blocker schema, `action_required` routing rules, regeneration scope rules
- `models/review.py` — `action_required: Optional[str] = "regenerate"` on `ReviewBlocker`
- `orchestrator.py` — blocker split by `action_required`; `associate_action` items bypass regen
- `frontend/src/types.ts` — `ReviewBlocker.action_required`, `FieldData.action`
- `frontend/src/lib/mapRunToReviewData.ts` — `fieldAction()` helper; `action` on all field objects
- `frontend/src/components/FieldComponent.tsx` — both action buttons always shown

**Test results:** `16 passed in 2.06s` — no regressions.

**Live stack:**
- Frontend: https://headout-listing-agent.vercel.app
- Backend: https://headout-listgenerationagent.onrender.com
- Database: Supabase project `feigtkfpvfaugwmgkwxm` (ap-northeast-1)

---

### Session 13 — Serper API SEO Integration (2026-05-03)

Added Google SERP intelligence as a pre-generation step. PAA questions seed FAQs, competitor titles inform A/B variant structure, and related searches supplement the tags array. All Serper failures degrade gracefully — pipeline always continues.

**Files created:**
- `models/serper.py` — `SerperContext`, `SerperOrganic` Pydantic models
- `agents/serper_agent.py` — LLM query gen (temp 0) + Serper API call + graceful degrade on all failure modes (blank key, timeout, 401, 429, bad JSON) → always returns `SerperContext`
- `backend/tests/test_serper_agent.py` — 9 tests covering all skip paths + happy path

**Files modified:**
- `models/listing.py` — `paa_source: Optional[str] = None` added to `FAQ` (backwards compatible)
- `models/__init__.py` — `SerperContext`, `SerperOrganic` exported
- `orchestrator.py` — 3 new states (`serper_in_progress`, `serper_complete`, `serper_skipped`); `serper_context` field on `PipelineRun`; serper step inserted between intake and generation; `serper_context.json` artifact always saved; `serper_context` passed to `content_generator.run()`, `review_agent.run()`, and `run_targeted_regen()`
- `agents/content_generator.py` — `serper_context` param on `run()` and `run_targeted_regen()`; builds "SEO Research Context" section in user prompt when serper not skipped
- `agents/review_agent.py` — `serper_context` param; injects keyword signal or skip note into review prompt
- `agent_prompt_content_generator.md` — "SEO Research Context" section: PAA → FAQ seeds with `paa_source`, competitor titles → A/B variant structural inspiration, related searches → tag candidates; prompt injection guard
- `agent_prompt_review.md` — Layer 3 check 3.9 (conditional): primary keyword from organic[0] present in title? Warning only, not a blocker
- `frontend/src/types.ts` — `serper_in_progress | serper_complete | serper_skipped` added to `RunStatus`
- `frontend/src/pages/ProcessingScreen.tsx` — stage 2 renamed to "Researching search landscape"; 4 new context lines for serper states
- `frontend/src/lib/mapRunToReviewData.ts` — per-FAQ `paa_source` citation: `source` field shows `Google users also ask: "..."` when present
- `backend/config.py` — `SERPER_API_KEY: str = ""`
- `backend/services/pipeline_service.py` — passes `settings.SERPER_API_KEY` to orchestrator; loads `serper_context.json` for associate-triggered regen; `serper_context.json` added to `_ARTIFACT_FILES`
- `.env.example` — `SERPER_API_KEY=` placeholder added
- `.env` — `SERPER_API_KEY` set (live key)

**Key design decisions:**
- `serper_context.json` always written — `{skipped: true, reason: "..."}` on any failure mode, so downstream can always load it without branching
- `SERPER_API_KEY` blank = auto-skip — existing deploys without the key keep working unchanged
- Content Generator treats `serper_context` as external/untrusted data — prompt injection guard prevents SERP content from issuing instructions
- PAA citation flows end-to-end: LLM outputs `paa_source` per FAQ → stored in `FAQ` model → mapper reads it → Review Screen source popover shows the Google question it came from

**Test results:** `16 passed in 2.85s` (7 existing + 9 new — no API key required)

---

### Session 12 — Pipeline Verification + Vercel Deploy (2026-05-03)

Confirmed full end-to-end pipeline execution with OpenAI, fixed three gpt-4o-mini compatibility issues, and deployed the frontend to Vercel.

**Model name fix:**
- `gpt-5-mini` was a non-existent placeholder; OpenAI silently routed it to `gpt-4o-mini`. Corrected explicitly in `.env`, `.env.example`, and `agents/llm_client.py`.

**Pipeline fixes (gpt-4o-mini output variance):**
- `agent_prompt_content_generator.md` — Hard-stop condition rewritten to reference `_meta.publish_blocked` explicitly, not individual `ambiguity_flags[*].blocks_publish`. Added IMPORTANT callout that flag-level `blocks_publish` is not a generation stop signal. Added it to the "Do NOT stop for" list. Root cause: `gpt-4o-mini` saw `blocks_publish: true` in a flag and returned an error JSON despite the prompt saying "Do NOT stop for CONDITIONAL inclusions".
- `models/listing.py` — Added `_coerce_str_to_list()` helper and `field_validator(mode="before")` on all `list[str]` fields across `KnowBeforeYouGo`, `SEO`, `Listing`, `Variant`, and `PublishVerdict`. Root cause: `gpt-4o-mini` occasionally returns a bare string instead of a single-item list.
- `models/listing.py` — `CopyQualityScore` fields defaulted to `""` (were required); `publish_verdict.copy_quality_score` made optional with `default_factory=CopyQualityScore`. Root cause: model omits the scoring block when content budget runs close.

**Pipeline verification:**
- Happy path demo runs end-to-end: Intake → Content Generator → Template Engine → Review Agent → escalation (correct — CONDITIONAL flag with no remedy policy triggers human review by design).
- Contradiction demo runs end-to-end: Review Agent correctly catches pickup time conflict (3:30 PM vs 4:00 PM) and escalates.
- 7/7 tests still passing.

**Vercel deploy:**
- No official Vercel MCP exists (`@vercel/mcp-server` returns 404). Used Vercel CLI directly.
- Project `headout-listing-agent` created under `ihazs-projects`. `ihaz.xyz` untouched.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (anon key, not service key) set in Vercel production env.
- `VITE_API_URL` not yet set — will point to Render URL once backend is deployed.
- **Live URL**: https://headout-listing-agent.vercel.app

---

### Session 11 — OpenAI API Migration (2026-05-03)

Migrated the active LLM integration from Gemini to OpenAI.

**Backend and agent changes:**
- `requirements.txt` — replaced `google-genai` with the official `openai` Python SDK.
- `agents/llm_client.py` — added a shared Responses API JSON helper with `OPENAI_MODEL` plus per-agent overrides.
- `agents/intake_agent.py`, `agents/content_generator.py`, `agents/review_agent.py` — swapped Gemini calls for OpenAI Responses API calls while preserving the existing two-attempt JSON retry and Pydantic validation flow.
- `generate_listing.py`, `backend/services/pipeline_service.py`, `backend/config.py` — now read `OPENAI_API_KEY`, support model overrides, and construct `OpenAI(...)`.

**Model decision:**
- Defaulted to `gpt-5-mini`, not a frontier/heavy model, because the tasks are structured extraction, controlled copy generation, and independent review.
- MCP is not needed for the core pipeline right now; the app already owns orchestration and deterministic tools. It can be added later if agents need external tool/data access.

**Tests/docs:**
- Updated API-key docs, model references in `product_overview.md`, prompt headers, and backend tests.
- Test suite remains API-free through mocks.

### Session 10 — Login Visual Refresh (2026-05-03)

Updated the Supabase Auth login screen to match the requested two-panel reference layout while keeping the existing email/password sign-in flow unchanged.

**Frontend changes:**
- `frontend/src/pages/LoginScreen.tsx` — replaced the compact single-card login with a split card: left artwork panel and right login form panel; preserved the existing `signIn(email, password)` behavior, loading state, validation, and error handling.
- `frontend/src/index.css` — added responsive login styles for desktop and mobile, including the centered white shell, soft purple page background, image panel, Headout logo row, form controls, button states, and mobile stacking.
- `frontend/public/headoutlogo.png` — added the supplied Headout logo asset for the form panel.
- `frontend/public/create.png` — added the supplied final left-panel artwork with embedded text.

**Iteration note:**
- Initial artwork used `createxperiences.png`; updated to `create.png` after the final image was supplied.
- Removed the added overlay headline/caption because the copy is now embedded in the artwork itself.

**Build:** `npm run build` passes.

---

### Session 9 — Frontend API Wiring + Auth (2026-05-03)

Connected all 6 frontend screens to the real FastAPI backend, added Supabase Auth login, added an `ErrorBoundary` component, and fixed a pre-existing test field-name bug.

**Backend additions:**
- `backend/services/supabase_service.py` — added `list_runs()` (Supabase or filesystem) and `_filesystem_list_runs()` helper
- `backend/routers/runs.py` — added `GET /api/v1/runs` list endpoint (returns up to 50 most recent runs)

**Frontend packages:**
- Installed `@supabase/supabase-js`
- Added `"types": ["vite/client"]` to `tsconfig.json` (fixes `import.meta.env` TS error)

**New frontend files:**
- `frontend/src/lib/supabase.ts` — Supabase client init; `getSessionToken`, `signIn`, `signOut`; gracefully returns `null` when `VITE_SUPABASE_URL` is blank (dev mode)
- `frontend/src/lib/api.ts` — typed fetch wrapper: `createRun`, `getRun`, `listRuns`, `patchField`, `regenerateSection`, `uploadImage`; reads `VITE_API_URL` (defaults to `http://localhost:8000`)
- `frontend/src/lib/mapRunToReviewData.ts` — maps `merged_listing.json` → `ReviewData`; reads `listing.*`, `intake_payload.*`, review blockers/warnings for per-field status
- `frontend/src/pages/LoginScreen.tsx` — Supabase Auth email/password form; `onLogin` callback on success
- `frontend/src/components/ErrorBoundary.tsx` — React class error boundary; wraps entire screen area in `App.tsx`
- `frontend/.env.example` — `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Modified frontend files:**
- `frontend/src/types.ts` — added `RunStatus`, `TERMINAL_OK`, `TERMINAL_FAIL`, `runStatusToListingStatus`, `ApiRun`, `RunDetail`, `ReviewBlocker`, `ReviewWarning`, `RunArtifacts`; updated `Screen` (added `'login'`), `ListingRow` (id is now `string`, added `runId`), `ProcessData` (removed `files`, added `runId`)
- `frontend/src/App.tsx` — Supabase auth state detection; shows `LoginScreen` when unauthenticated; skips auth check when Supabase not configured (dev bypass); `ErrorBoundary` wraps all screens; `onOpen` now passes `runId` not `ListingRow`
- `frontend/src/pages/UploadScreen.tsx` — `handleProcess` calls `api.createRun(supplierInput)`; reads text/CSV files directly; returns `run_id` via `onProcess`; shows error below CTA on failure
- `frontend/src/pages/ProcessingScreen.tsx` — polls `GET /api/v1/runs/{runId}` every 2.5s; maps `RunStatus` → stage index and context line; shows `AlertTriangle` failure card with "Back to dashboard" on terminal fail; falls back to timed demo if no `runId`
- `frontend/src/pages/Dashboard.tsx` — fetches `GET /api/v1/runs` on mount; maps `ApiRun` → `ListingRow`; loading/error states with Retry; `onOpen` now passes `runId` string; Refresh button
- `frontend/src/pages/ReviewScreen.tsx` — added `runId` prop; fetches `GET /api/v1/runs/{runId}` on mount; calls `mapRunToReviewData` to populate fields; loading state; nav section statuses derived from actual field statuses; falls back to mock data on error

**Bug fix:**
- `tests/test_cli.py` — `start_times` → `startTimes` in template engine null/empty/non-empty test (aligns with Session 8 camelCase schema change that the test missed)

**Test results:** `7 passed in 1.56s` — no regressions.

**Build:** `npm run build` passes, `tsc --noEmit` clean, 0 TypeScript errors.

---

### Session 8 — Schema Alignment + Prompt Consistency Audit (2026-05-03)

Grounded all agent prompts in the actual Headout API JSON examples (`api_json_examples.md`), fixed Supabase auth bypass, aligned template engine to the camelCase intake schema, and completed a full cross-layer consistency audit.

**Auth fix:**
- `backend/dependencies.py` — dev bypass now returns `{"id": None, "email": "dev@local"}` (NULL, not a fake UUID) to avoid FK violation on `runs.created_by → auth.users(id)`
- `backend/routers/runs.py` — `created_by` only included in the insert row if `user["id"]` is not None

**Model fix:**
- `models/intake.py` — added `INFERRED` to `AmbiguityType` enum (Gemini legitimately returns it for implied fields)

**Template engine fixes (`agents/template_engine.py`):**
- `_build_offers()` fully rewritten to read `variants[*].pricing[{ageGroup, pricePerUnit, currencyCode}]` array; falls back to old cents-based fields only if the new structure is absent
- `_build_tour_activity()` — removed stale `tour_name` fallback; fixed `start_times` → `startTimes`; removed `max_pax` fallback; reads `durationText` first, converts `duration` ms only as fallback
- Added `_city_name()` helper supporting both flat string and `{code, name}` object
- `_build_location()` reads `coordinates.latitude/longitude` nested object
- `_build_breadcrumb()` uses `_city_name()` helper
- Cancellation reads `refundPercentage` and both `cutoffHours`/`refundBeforeHours`

**Orchestrator fix (`orchestrator.py` `_merge()`):**
- FAQPage in JSON-LD is now rebuilt from listing FAQs after merge (not from intake FAQs), keeping JSON-LD in sync with generated copy and eliminating FAQ count mismatch (blocker B007)

**Supabase service fix:**
- `backend/services/supabase_service.py` — artifact upsert conflict target corrected to `on_conflict="run_id,type"` (was defaulting to PK, causing duplicate rows)
- Artifact type key renamed from `'escalation'` to `'escalation_record'` to match DB CHECK constraint

**Prompt standards — grounded in `api_json_examples.md`:**
- Highlights: corrected from 10–15 words → **2–8 words** (real Headout API examples show 2–6 words)
- FAQ minimum: corrected from 6 → **7** across all three agent prompts
- `tourType` codes aligned to Headout API: `GUIDED_TOUR`, `SHOW_OR_EVENT`, `ATTRACTION_TICKET`, `DESERT_SAFARI`, `COMBO_TICKET`
- `agent_prompt_supplier_intake.md` — full explicit payload schema added; `city {code, name}` object, `durationText`, `variants[*].pricing[]` array, `cancellationPolicy.refundPercentage`, `inputFields[]`, `media[]`, `weatherDependent`, `openingHours`; `pricePerUnit` in dollars (not cents); 10 new self-check assertions

**Consistency audit — field name fixes:**

`agent_prompt_review.md` — all field references updated to match camelCase intake schema:
- `duration_ms` → `duration` (+ added reference to `durationText`)
- `start_times` → `startTimes`
- `has_hotel_pickup` → `hasHotelPickup`
- `has_free_cancellation`/`cutoff_hours` → `cancellationPolicy.type`/`refundPercentage`/`cutoffHours`
- `max_pax` → `maxGroupSize`

`agents/template_engine.py` — stale field name fallbacks removed:
- `p.get("tour_name")` fallback removed
- `p.get("start_times")` → `p.get("startTimes")`
- `p.get("max_pax")` fallback removed

`agent_prompt_content_generator.md` — added "Reading the Intake Payload" section explaining the new field structure; stop conditions updated from `adult_price` to `variants[0].pricing` ADULT check.

---

### Session 7 — Phase 2 Pipeline Integration (2026-05-03)

Wired the synchronous orchestrator into FastAPI's async background task system, added targeted regen and image upload endpoints, parallelised the Content Generator + Template Engine, and added 3 backend invariant tests.

**Files created:**
- `backend/services/pipeline_service.py` — ThreadPoolExecutor bridge: `launch_pipeline`, `launch_regeneration`, `save_image`
- `backend/tests/__init__.py` — package marker
- `backend/tests/test_pipeline_service.py` — 3 backend invariant tests (orchestrator exception → `generation_blocked`, Supabase write retry × 3, escalation_record.json written on double review fail)

**Files modified:**
- `orchestrator.py` — added `run_id` + `status_callback` params; `_notify()` helper; Content Generator + Template Engine now parallel via `ThreadPoolExecutor(max_workers=2)`
- `backend/routers/runs.py` — `POST /runs` fires `launch_pipeline` as `BackgroundTask`; added `POST /runs/:id/regenerate` and `POST /runs/:id/images`

**Test results:** `7 passed in 2.17s` (pre-Serper baseline)

**Sync/async constraint respected:** orchestrator is sync; no async callbacks injected into threads. Queue-based pattern per `cto_instructions.md` Section 4.

---

### Session 6 — Phase 1 Backend Skeleton (2026-05-02)

Built the full FastAPI backend skeleton and CLI test suite. No pipeline execution yet — POST /runs creates a run record and returns a run_id; the background task wiring is Phase 2.

**Files created:**
- `backend/main.py`, `backend/config.py`, `backend/dependencies.py`
- `backend/routers/runs.py` — `POST /api/v1/runs`, `GET /api/v1/runs/:id`, `PATCH /api/v1/runs/:id/fields`
- `backend/services/supabase_service.py` — `supabase_write_with_retry()` with 3-attempt retry + filesystem fallback
- `supabase/migrations/001_initial_schema.sql` — 4 tables, RLS on all, `updated_at` trigger
- `.github/workflows/keep-warm.yml` — cron ping every 14 min
- `tests/test_cli.py` — 4 passing invariant tests

**Packages added to `requirements.txt`:** `fastapi`, `uvicorn[standard]`, `pydantic-settings`, `python-multipart`, `supabase`, `httpx`, `pytest`, `pytest-asyncio`

**Bug fixed:** `agents/email_generator.py` used Python 3.10+ union syntax (`str | None`). Changed to `Optional[str]` for Python 3.9 compatibility.

**Test results:** `4 passed in 2.34s` — no Supabase or Gemini API key required.

**Smoke test:** `GET /health → {"status":"ok"}`, `POST /api/v1/runs → {"run_id":"...","status":"pending"}` verified locally.

---

### Session 5 — GitHub Setup (2026-05-02)

Initialised git repository and pushed all 64 project files to GitHub in a single initial commit.

**Repo**: https://github.com/aiihaz/headout-listgenerationagent

**What was pushed:**
- All Python pipeline code (`agents/`, `models/`, `orchestrator.py`, `generate_listing.py`)
- All three agent system prompts (`agent_prompt_*.md`)
- All engineering specs and API research docs
- Complete React/Vite/TypeScript frontend (6 screens, Halyard fonts, all components)
- Both example supplier inputs (`examples/`)
- `.gitignore`, `.env.example`, `requirements.txt`
- `listings/.gitkeep` — keeps the artifacts directory in the repo without committing generated run outputs

**Branch structure decision:** Default branch is `staging` (WIP). `main` will be created from a clean merge when the product is ready to ship. `main` was deleted from remote after renaming.

**.gitignore rules:**
- `listings/*/` — generated run artifacts (intake.json, listing.json, etc.) are local-only
- `frontend/node_modules/`, `frontend/dist/` — build outputs
- `.env` — API key never committed; `.env.example` is the template
- `.claude/`, `.playwright-mcp/`, `.DS_Store` — local tooling

---

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
