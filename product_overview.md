# Headout Listing Creation Tool — Product Overview

---

## The Goal

Build an AI-powered internal tool that transforms raw supplier data into a fully written, SEO-optimised, quality-reviewed Headout listing — ready to publish — in under 10 minutes. The tool should reduce catalog associate time spent on content creation to near zero, so the associate's role becomes review and approval rather than production.

At scale, this means Headout can onboard new experiences faster, keep live listings accurate as supplier data changes, and continuously improve listing performance through automated A/B testing and iteration — without growing the catalog team linearly with catalog size.

---

## The Problem

Creating a new Headout listing today requires a catalog associate to do several things manually: read and interpret raw supplier data (PDFs, emails, CSVs, API dumps), write all customer-facing copy from scratch in Headout's brand voice, coordinate back and forth with the supplier when information is missing or ambiguous, assemble SEO metadata and structured data, and run it through quality review. Each listing can take hours. Across a catalog of thousands of active experiences in 160+ cities, this is the primary bottleneck on catalog growth.

The problem compounds over time. Supplier offerings change — new inclusions, price updates, deprecated features, new start times — and there is no systematic mechanism to detect these changes and refresh the corresponding listing. A listing written six months ago may no longer accurately reflect what the supplier delivers. And once a listing is published, performance data (search rankings, click-through rate, conversion) rarely feeds back into improving the copy — listings are treated as set-and-forget rather than as living assets.

---

## The Solution

A three-agent AI pipeline, fronted by an associate-facing review interface, that handles the full lifecycle of a listing from raw supplier data to publish — and continues to improve it after launch.

**The Intake Agent** receives raw supplier data in any format and produces a clean, structured JSON object with every field classified, flagged for confidence level, and marked as confirmed, conditional, or deferred. This is the ground truth for everything downstream.

**The Content Generator** takes the structured intake data and produces all customer-facing copy in Headout's voice: title and A/B variant, short and full descriptions, six highlights, inclusions and exclusions, FAQs, SEO title, meta description, tags, variant names, and a complete structured data block (TourActivity, FAQPage, BreadcrumbList). It also proposes a first A/B test with a full hypothesis and ICE score. A parallel deterministic Template Engine maps intake fields to schema.org JSON-LD without any LLM involvement — ensuring structured data is never hallucinated.

**The Review Agent** acts as an independent critic. It has never seen the content generator's instructions. It cross-references every factual claim in the generated copy against the intake data, checks every sentence against Headout's voice rules, and audits the SEO output for completeness. It returns a structured verdict — pass, conditional pass, or fail — with field-level blockers, precise fix instructions, and a targeted regeneration scope. Only failing fields are regenerated, not the full listing.

The associate's role is to review the structured data before copy generation (resolving ambiguous fields, triggering supplier clarification where needed), upload images, review the generated copy section by section, and approve for publish. The entire content production step is removed from their workflow.

After publish, the tool triggers Headout's existing Rosetta localization microservice to translate the approved English listing into all target languages for that city/market. Thirty days post-launch, the system checks GSC and A/B performance data against category benchmarks. Underperforming listings are automatically flagged for an iteration run, where the content generator receives the existing copy plus performance data and generates new variants built on what's working.

---

## The Workflow

### 1. Ingestion and Duplicate Check

The associate pastes raw supplier text or uploads a CSV. Before any processing begins, the tool runs a duplicate detection check against the existing catalog using vector similarity on tour name, location, and inclusions. If a potential duplicate is found, the associate sees a side-by-side comparison and decides: merge into the existing listing or create a new one. If no duplicate, the Intake Agent runs.

### 2. Structured Data Review

The associate sees the intake-structured data field by field. Every field has a state: confirmed, needs supplier clarification, needs internal decision, or resolved. For fields that need supplier input, the tool auto-drafts a single clarification email grouping all open questions. The associate reviews and sends it. The email contains a structured form link; when the supplier fills it in, the responses auto-resolve the flagged fields and queue the listing to advance. The associate handles internal decisions inline.

### 3. Image Upload

Before copy generation begins, the associate uploads images. The pipeline checks each image against minimum spec (resolution, aspect ratio, no watermarks), generates SEO alt text for every image using intake data, and flags any that don't pass. Copy generation holds until at least one approved image is present, or the associate bypasses the step explicitly.

### 4. Copy Generation and Review

The Content Generator and Template Engine run in parallel. The associate sees the generated listing section by section: title, short description, four full-description sections, highlights, FAQs, SEO fields, variant descriptions, and a structured data preview. Every section has a Regenerate button — clicking it runs targeted regeneration on that section alone, passing the Review Agent's fix instruction as context, leaving everything else unchanged.

### 5. Review Agent Verdict

The Review Agent runs automatically after copy generation. Its verdict is surfaced inline: pass means the listing is ready for approval, conditional pass means it can go live with warnings noted for the next iteration, and fail highlights specific blocking fields with the exact fix required. The Review Agent's verdict is the only quality signal shown to the associate — the content generator's self-check is not surfaced.

### 6. Approval and Publish

The associate approves the listing, selects which variant to publish (or both for a split test), and sets timing. On approval, the listing enters the publish queue, Rosetta is triggered with the target-language configuration for that city, and the A/B test plan is logged to the experiment tracker.

### 7. Performance Loop

Thirty days after publish, the system pulls GSC data (CTR, impressions, average position) and A/B test results for the listing. If performance is below category benchmarks, the listing is flagged for a Mode 2 iteration run. The content generator receives the existing copy alongside performance data and generates new variants that build on winning patterns while exploring angles that haven't been tested yet.

---

## The Architecture

The system has four processing components and one review interface.

```
[Supplier Data — paste or CSV]
           │
           ▼
  [Duplicate Detection]
  ├── Duplicate found → Associate: merge or create new
  └── No duplicate → continue
           │
           ▼
  [Agent 1: Intake Agent]             Model: Gemini 2.5 Flash | Temp: 0
  Classifies and structures raw supplier data into intake.json
           │
           ▼
  [Associate: Structured Data Review + Image Upload]
           │
  Supplier clarification email ──► Supplier form response ──► Auto-resolve fields
           │
           ▼
  ┌────────────────────────────────────────────────────────┐
  │                    PARALLEL                             │
  │                                                        │
  │  [Agent 2: Content Generator]    [Template Engine]     │
  │  Model: Gemini 2.5 Flash         Deterministic code    │
  │  Temp: 0.7                       No LLM                │
  │  Produces all copy, SEO,         Maps intake fields     │
  │  strategy, A/B plan              to TourActivity +      │
  │                                  FAQPage +              │
  │                                  BreadcrumbList JSON-LD │
  └────────────────────────────────────────────────────────┘
           │
  [Orchestrator merges outputs]
  Template Engine JSON-LD is authoritative for @graph block
           │
           ▼
  [Agent 3: Review Agent]             Model: Gemini 2.5 Flash | Temp: 0
  Independent critic — three layers:
  Layer 1: Factual accuracy vs intake.json (9 checks)
  Layer 2: Headout voice compliance (8 checks)
  Layer 3: SEO completeness (8 checks)
           │
      ┌────┴────┐
    PASS      FAIL
      │          │
      │   [Targeted regeneration — failing fields only]
      │   Agent 2 re-runs with fix instructions as context
      │   Max 2 attempts
      │          │
      │     ┌────┴────┐
      │   PASS     FAIL (2nd)
      │     │          │
      │     │   [Human escalation]
      │     │   Pipeline halts, ops team notified
      └─────┘
           │
  [Associate Approval]
           │
  ┌────────┼──────────┐
  ▼        ▼          ▼
Publish  Rosetta    A/B test
queue    trigger    logged
  │
  [30-day performance check]
  GSC data + A/B results vs category benchmarks
           │
  [Mode 2: Iterate from performance data]
  Content Generator receives existing copy + metrics
  Generates new variants on winning angles
```

### Agent Specifications

| Component | Type | Model | Temperature | Input | Output |
|---|---|---|---|---|---|
| Intake Agent | LLM | Gemini 2.5 Flash | 0 | Raw supplier data | `intake.json` |
| Content Generator | LLM | Gemini 2.5 Flash | 0.7 (0.3 on regen) | `intake.json` | `listing.json` |
| Template Engine | Deterministic code | — | — | `intake.json` | `verified_json_ld.json` |
| Review Agent | LLM | Gemini 2.5 Flash | 0 | `intake.json` + `merged_listing.json` | `review.json` |

### Key Design Principles

**The Review Agent never sees the Content Generator's instructions.** It evaluates output against two fixed references — the intake data (facts) and Headout's voice rules (quality). This eliminates the self-grading problem: a model cannot be a reliable judge of its own output.

**Targeted regeneration, not full reruns.** When the Review Agent returns a fail, only the specific failing fields are regenerated. The fix instruction per blocker is precise enough for the model to act on without seeing the review. This keeps costs low and avoids introducing new errors into sections that were already passing.

**The Template Engine never invents.** If a field is null or blocked in intake, it is omitted from the JSON-LD output — not replaced with a placeholder. A metadata sidecar logs every intentional omission so the Review Agent knows what was deliberately excluded versus what was missed.

**Translation fires after approval, not before.** Rosetta is triggered on the approved English listing. Translating a draft that may still change wastes translation budget and creates version drift across languages.

**The performance loop closes the system.** Without GSC and A/B data feeding back in, the tool is a one-shot generator. With it, every listing becomes a continuously improving asset — the system gets smarter about which angles work for which experience types in which markets over time.
