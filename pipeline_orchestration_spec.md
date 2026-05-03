# Headout Listing Pipeline — Orchestration Spec
## Engineer Implementation Guide

---

## Overview

The pipeline converts raw supplier data into a publish-ready Headout listing: copy, SEO metadata, structured data, and a canonical A/B test plan. Three LLM agents plus one deterministic template engine work in sequence with a conditional regeneration loop.

```
[Supplier Data Input]
         │
         ▼
  ┌─────────────┐
  │  Agent 1:   │
  │  Intake     │  → structured intake JSON (ground truth)
  └──────┬──────┘
         │
         ├────────────────────────────────┐
         │                                │
         ▼                                ▼
  ┌─────────────┐                ┌─────────────────┐
  │  Agent 2:   │                │ Template Engine │
  │  Content    │  → listing     │ (deterministic) │ → verified_json_ld.json
  │  Generator  │    JSON        └────────┬────────┘
  └──────┬──────┘                         │
         │         ◄──────────────────────┘
         │         (orchestrator merges outputs)
         │
         ▼
  ┌─────────────┐
  │  Agent 3:   │
  │  Review     │  → review verdict JSON
  └──────┬──────┘
         │
    ┌────┴────┐
    │         │
   PASS     FAIL
    │         │
    │         ▼
    │   [Targeted Regeneration]
    │   Agent 2 re-runs on failing
    │   fields only (max 2 attempts)
    │         │
    │    ┌────┴────┐
    │    │         │
    │   PASS    FAIL (2nd)
    │    │         │
    │    │         ▼
    │    │   [Human Escalation]
    │    │   Stop pipeline, notify
    │    │
    └────┴──► [Publish Queue]
```

---

## Agent Definitions

| Agent | Model | Role | Input | Output |
|---|---|---|---|---|
| Agent 1: Intake | OpenAI `gpt-5-mini` | Classify and structure raw supplier data | Raw supplier payload (any format) | `intake.json` |
| Agent 2: Content Generator | OpenAI `gpt-5-mini` | Generate all listing copy and SEO artifacts | `intake.json` | `listing.json` |
| Template Engine | Deterministic code | Map intake fields to schema.org JSON-LD | `intake.json` | `verified_json_ld.json` + `verified_json_ld_meta.json` |
| Agent 3: Review | OpenAI `gpt-5-mini` | Independent factual + voice + SEO quality check | `intake.json` + `listing.json` + `verified_json_ld.json` | `review.json` |

---

## Step-by-Step Execution

### Step 1 — Intake Agent

**Trigger**: New supplier data received (webhook, file drop, API call)

**Input format**: Unstructured or semi-structured supplier payload. May be:
- JSON from a supplier API
- CSV export
- PDF parsed to text
- Manual operator form

**System prompt**: `agent_prompt_supplier_intake.md`

**API call**:
```
model: gpt-5-mini
system: [contents of agent_prompt_supplier_intake.md]
user: [raw supplier data]
Responses API JSON mode
reasoning_effort: low
```

**Output**: `intake.json` — complete structured listing object with all fields classified and flagged (CONDITIONAL, DEFERRED, null as appropriate).

**On error**:
- If OpenAI returns malformed JSON: retry once with explicit instruction to fix JSON
- If retry fails: halt pipeline, log `intake_failed`, notify operator
- Do not proceed to Step 2 without a valid `intake.json`

**Rate limit**: OpenAI limits vary by account tier and model. Throttle by the account's current `gpt-5-mini` RPM/TPM limits and queue intake jobs if needed.

---

### Step 2 — Parallel: Content Generator + Template Engine

Run both in parallel immediately after Step 1 completes. They are independent of each other.

#### 2A — Content Generator

**System prompt**: `agent_prompt_content_generator.md`

**Input**: `intake.json` (full contents)

**API call**:
```
model: gpt-5-mini
system: [contents of agent_prompt_content_generator.md]
user: [intake.json serialized as string]
Responses API JSON mode
reasoning_effort: low
```

Note: temperature 0.7 for copy generation (allows creative variance). The Review Agent catches errors; this is not a correctness step.

**Output**: `listing.json` — all copy, SEO fields, variants, structured_data strategy, ab_test_plan, publish_verdict (preliminary).

**On error**:
- Malformed JSON: retry once with `temperature: 0.3` and explicit instruction to return valid JSON
- `error: true` returned by agent (hard stop condition): halt pipeline, log `content_generation_blocked`, reason in log
- Max 2 retries total on this step before escalating to human

#### 2B — Template Engine

**Input**: `intake.json`

**Process**: Deterministic field mapping per `structured_data_template_engine.md`

**Output**:
- `verified_json_ld.json`
- `verified_json_ld_meta.json`

**On error**:
- Fatal validation check fails: log `schema_fatal`, emit error details, halt pipeline
- Warning-only: continue, log warnings in `verified_json_ld_meta.json`
- Target runtime: < 200ms — if exceeds 2s, log performance warning

#### 2C — Orchestrator Merge (after both 2A and 2B complete)

The orchestrator creates `merged_listing.json` by:
1. Taking `listing.json` as the base
2. Overwriting `listing.structured_data.json_ld` with `verified_json_ld.json` — the Template Engine output is authoritative for the `@graph` block
3. Preserving `listing.structured_data.canonical_strategy`, `ai_visibility`, and `internal_linking` from the Content Generator — these are strategy fields, not schema fields
4. Attaching `verified_json_ld_meta.json` as `listing.structured_data._template_meta`

`merged_listing.json` is the input to Step 3.

---

### Step 3 — Review Agent

**System prompt**: `agent_prompt_review.md`

**Input**: Two documents passed as context

```
model: gpt-5-mini
system: [contents of agent_prompt_review.md]
user: [structured prompt — see below]
Responses API JSON mode
reasoning_effort: low
```

Note: temperature 0 for the review agent. This is a verification step, not a creative one. Determinism matters.

**User prompt format**:
```
## Intake Agent Output (ground truth)

{{intake.json}}

---

## Content Generator Output

{{merged_listing.json}}
```

**Output**: `review.json` — the authoritative quality verdict.

**On error**:
- Malformed JSON: retry once
- Max 1 retry before treating as escalation

---

### Step 4 — Verdict Routing

Read `review.json.review.overall`.

#### Case A: `overall: "pass"`

- Mark listing as `ready_for_publish`
- Attach `review.json` and `merged_listing.json` to the listing record
- Push to publish queue
- Log: `pipeline_complete`, pass, time elapsed

#### Case B: `overall: "conditional_pass"`

- Mark listing as `ready_for_publish`  
- Attach `review.json.review.warnings[]` to the listing record as a deferred improvement list
- Push to publish queue
- Log: `pipeline_complete`, conditional_pass, warning count, time elapsed
- Queue warning items for the next iteration (Mode 2 of Content Generator)

#### Case C: `overall: "fail"`

- Read `review.json.review.regeneration_scope[]` — list of failing field paths
- Read `review.json.review.blockers[]` — each has a `fix_instruction`
- Check `review.json.review.escalate_to_human`
  - If `true`: skip regeneration, go directly to human escalation (Step 5B)
  - If `false`: proceed to Step 5A (targeted regeneration)

---

### Step 5A — Targeted Regeneration (First Attempt)

**This is not a full rerun.** Only the fields in `regeneration_scope[]` are regenerated.

**Build the regeneration prompt**:

```
You are the Headout Content Generation Agent operating in TARGETED REGENERATION MODE.

The Review Agent has identified specific issues in your previous output. You are to rewrite ONLY the listed fields. Do not change anything else.

## Intake Data (unchanged)
{{intake.json}}

## Previous Full Output (do not modify fields not listed below)
{{merged_listing.json}}

## Fields to Regenerate
{{regeneration_scope[]}}

## Fix Instructions
{{For each blocker in review.json.review.blockers[]:
  Field: blocker.field
  Problem: blocker.found
  Instruction: blocker.fix_instruction
}}

Return a JSON object containing ONLY the regenerated fields at their original paths.
Merge these into the existing output — everything else stays unchanged.
```

**API call**:
```
model: gpt-5-mini
system: [agent_prompt_content_generator.md]
user: [regeneration prompt above]
Responses API JSON mode
reasoning_effort: low
```

Note: lower temperature for regeneration — the agent has specific instructions to follow.

**Output**: Partial JSON with only the regenerated fields. Orchestrator merges these back into `merged_listing.json` to produce `merged_listing_v2.json`.

**Then**: Run Review Agent again on `merged_listing_v2.json` (same Step 3 process). Label this run as `review_pass: 2`.

---

### Step 5B — Targeted Regeneration (Second Attempt)

If the second review still returns `overall: "fail"`:

- Set `escalate_to_human: true` automatically (regardless of review agent flag)
- Proceed to Step 6 (Human Escalation)
- Log: `pipeline_failed_after_2_regeneration_attempts`

If the second review returns `pass` or `conditional_pass`: follow the same routing as Step 4.

---

### Step 6 — Human Escalation

**Trigger conditions** (any one is sufficient):
1. Review Agent set `escalate_to_human: true` on the first review
2. Two regeneration attempts both failed
3. Intake Agent hard stop (Step 1 fatal error)
4. Content Generator hard stop (`error: true` returned)

**Actions**:
1. Mark listing as `escalated_to_human`
2. Create an escalation record with:
   ```json
   {
     "listing_id": "string",
     "escalation_trigger": "string — which condition fired",
     "escalation_reason": "review.json.review.escalation_reason (if from review agent) | error details (if from earlier step)",
     "review_pass_count": 1 | 2,
     "blockers": ["copy of review.json.review.blockers[]"],
     "recommended_action": "string — what the human should do"
   }
   ```
3. Notify the content operations team (webhook, email, or ops queue — implementation-specific)
4. Attach all pipeline artifacts for human review: `intake.json`, `merged_listing.json` (latest version), `review.json`

**Human resolution paths**:
- Human edits `merged_listing.json` directly and marks as resolved → push to publish queue
- Human updates supplier data in intake and reruns pipeline from Step 1
- Human marks listing as `permanently_blocked` (e.g. supplier data issue cannot be resolved)

---

## Data Contracts

### `intake.json` — Minimum Required Fields

The following fields must be present and non-null for the pipeline to proceed past Step 1. Everything else is optional (and may be null, CONDITIONAL, or DEFERRED).

```json
{
  "tour_name": "string",
  "experience_type": "TOUR | ATTRACTION | EVENT",
  "inventory_type": "FIXED_START_FIXED_END | FIXED_START_FLEXIBLE_END | FLEXIBLE_START_FIXED_DURATION | FLEXIBLE_START_FLEXIBLE_DURATION",
  "location": {
    "city": "string",
    "country": "string"
  },
  "inclusions": ["string"],
  "has_free_cancellation": "boolean"
}
```

### `review.json` — Complete Schema Reference

```json
{
  "review": {
    "overall": "pass | conditional_pass | fail",
    "scores": {
      "factual_accuracy": "0-100",
      "voice_compliance": "0-100",
      "seo_completeness": "0-100"
    },
    "blockers": [
      {
        "id": "B001",
        "field": "listing.description.full.section_2.body",
        "type": "hallucination | conditional_not_hedged | deferred_stated_as_fact | inclusion_not_in_intake | factual_mismatch | voice_violation | seo_violation | schema_error",
        "found": "exact quote from generated content",
        "intake_says": "value or flag from intake JSON",
        "severity": "blocker",
        "fix_instruction": "specific rewrite instruction"
      }
    ],
    "warnings": [
      {
        "id": "W001",
        "field": "listing.seo.title",
        "issue": "description",
        "suggestion": "how to improve"
      }
    ],
    "escalate_to_human": "boolean",
    "escalation_reason": "string | null",
    "regeneration_scope": ["listing.description.full.section_2.body"]
  }
}
```

---

## State Machine

Each listing has a `pipeline_status` field. Valid transitions:

```
pending
  → intake_in_progress
  → intake_complete
  → generation_in_progress      (Agent 2 + Template Engine running)
  → generation_complete
  → review_in_progress          (Agent 3 running)
  → ready_for_publish           (pass or conditional_pass)
  → regeneration_in_progress    (targeted regen running)
  → escalated_to_human          (human review required)
  → permanently_blocked         (human marked as unresolvable)
  → published                   (pushed to live)

Failure states (terminal without human intervention):
  → intake_failed
  → generation_blocked          (Content Generator returned error: true)
  → schema_fatal                (Template Engine fatal validation)
```

---

## Rate Limit Handling

OpenAI `gpt-5-mini` limits:
- Limits vary by account tier. Read the account's current RPM/TPM limits and throttle the worker queue accordingly.

Each pipeline run consumes 3 LLM calls (Intake + Content Generator + Review). Regeneration adds 1-2 more.

**Throttling strategy**:
- Maintain a token bucket per model
- Queue jobs when at RPM limit — do not drop
- Stagger parallel Step 2A + 2B calls: Template Engine starts immediately (deterministic, no API), Content Generator starts with standard queue
- Batch processing: if running multiple listings, spread calls across minutes, not seconds

**Timeout policy**:
- Intake Agent: 60s max
- Content Generator: 90s max (longer due to full listing generation)
- Template Engine: 5s max
- Review Agent: 60s max
- On timeout: retry once, then treat as error

---

## Logging

Every pipeline run emits a structured log record:

```json
{
  "run_id": "uuid",
  "listing_id": "string",
  "supplier_id": "string",
  "started_at": "ISO 8601",
  "completed_at": "ISO 8601",
  "duration_ms": "number",
  "status": "pipeline_status value",
  "review_pass_count": "0 | 1 | 2",
  "review_overall": "pass | conditional_pass | fail | n/a",
  "blocker_count": "number",
  "warning_count": "number",
  "escalated": "boolean",
  "escalation_reason": "string | null",
  "llm_calls": "number",
  "tokens_consumed": {
    "intake": "number",
    "content_generator": "number",
    "review": "number",
    "regeneration": "number"
  },
  "errors": ["string"]
}
```

---

## File Artifacts per Run

| File | Created by | Used by |
|---|---|---|
| `intake.json` | Agent 1 | Agent 2, Template Engine, Agent 3 |
| `listing.json` | Agent 2 | Orchestrator (merge) |
| `verified_json_ld.json` | Template Engine | Orchestrator (merge) |
| `verified_json_ld_meta.json` | Template Engine | Agent 3, logging |
| `merged_listing.json` | Orchestrator | Agent 3 |
| `review.json` | Agent 3 | Orchestrator (routing) |
| `merged_listing_v2.json` | Orchestrator (after regen) | Agent 3 (2nd review) |
| `escalation_record.json` | Orchestrator | Human ops team |

All files stored per run at: `listings/{listing_id}/runs/{run_id}/`

---

## Configuration

```json
{
  "model": "gpt-5-mini",
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
    "malformed_json": 1,
    "regeneration_attempts": 2
  },
  "rate_limit": {
    "source": "OpenAI account tier limits for selected model"
  }
}
```

---

## Testing Checklist

Before deploying the pipeline, verify these scenarios end-to-end:

| Scenario | Expected outcome |
|---|---|
| Clean supplier data, no conditionals | Pass on first review, no regen |
| Supplier data with CONDITIONAL inclusion, content generator hedges correctly | Pass or conditional_pass |
| Supplier data with CONDITIONAL inclusion, content generator fails to hedge | Fail → regen → pass |
| `duration_ms: null` | Template Engine omits duration, no crash |
| `adult_price.status: blocked` | Content Generator omits price, Review Agent does not flag |
| Content Generator invents a statistic | Review Agent flags hallucination, regen fixes it |
| Content Generator uses banned opener | Review Agent flags voice_violation, regen fixes it |
| Same hallucination appears after regen | 2nd review fails → human escalation |
| 3+ hallucination blockers on first review | `escalate_to_human: true` immediately, no regen |
| OpenAI API timeout | Retry once, then log error and halt |
| Template Engine fatal validation (e.g. malformed price) | Halt pipeline, log `schema_fatal` |
