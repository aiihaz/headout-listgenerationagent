# Headout Listing Creation Tool — MVP Product Brief

---

## Problem

Creating a new Headout listing requires a catalog associate to manually parse raw supplier data, write copy from scratch, format structured data, coordinate with the supplier for missing information, and manage multiple back-and-forth cycles before a listing is publishable. At scale (160+ cities, thousands of active experiences), this is the primary bottleneck on catalog growth.

## Solution

An associate-facing tool that takes raw supplier data as input and produces a review-ready, publish-ready listing — with AI-generated copy, automated supplier clarification, image management, and an A/B test plan — all within a single workflow. The associate's job shifts from content creation to content review and quality control.

---

## MVP Scope

### What's in MVP

| Feature | Notes |
|---|---|
| Supplier data ingestion (paste or CSV upload) | Single listing at a time for MVP |
| Duplicate detection before creation | Pre-flight check against existing catalog |
| AI-powered structured data review screen | Intake Agent output, field-level flagging |
| Supplier clarification email automation | Auto-send for flagged fields needing supplier input |
| Structured supplier response capture | Form link in email, auto-resolves flagged fields |
| Image upload section | Associate uploads images; pipeline generates alt text |
| AI copy generation | Content Generator output, section-level view |
| Section-level regeneration | Regenerate any individual section without full rerun |
| Review Agent quality verdict | Factual accuracy, voice, SEO — per field |
| A/B variant publishing | Associate chooses which variant to push live |
| Translation trigger via Rosetta | Auto-fires after publish approval |
| Performance feedback loop | CTR + A/B results feed Mode 2 iteration |

### What's Deferred (Post-MVP)

| Feature | Reason |
|---|---|
| Bulk / batch CSV ingestion | MVP proves single-listing workflow first |
| Hub / category page content generation | Depends on listing pipeline being stable |
| Supplier self-serve portal | Right long-term direction; requires supplier-facing product work |

---

## Workflow — Step by Step

### Step 1: Ingestion

The associate pastes raw supplier text or uploads a CSV. The tool runs a **duplicate detection check** before doing anything else — comparing tour name, location, and inclusions against the existing catalog using vector similarity. If a potential duplicate is found, the associate sees a side-by-side comparison and chooses: merge into existing listing, or create new.

If no duplicate, the Intake Agent runs and produces `intake.json`.

---

### Step 2: Review Screen — Structured Data

The associate sees the intake-structured data in a clean, field-by-field view. Each field has one of four states:

| State | Meaning | Associate action |
|---|---|---|
| `confirmed` | Field is complete and unambiguous | None required |
| `needs_supplier_clarification` | Missing or ambiguous — supplier must answer | Review the auto-drafted email, send |
| `needs_internal_decision` | Ambiguous but supplier cannot resolve it (e.g. experience type classification) | Associate decides inline |
| `resolved` | Was flagged, now confirmed | Read-only |

The tool auto-drafts a **supplier clarification email** for every `needs_supplier_clarification` field, grouped into a single email (not one email per field). The associate reviews and sends. The email contains a structured form link where the supplier fills in the missing fields directly — their response auto-resolves the flagged fields and queues the listing for the next step.

Associates can also manually edit any field and mark it resolved themselves.

---

### Step 3: Image Upload

Before copy generation runs, the associate uploads images for the listing. The pipeline:

- Checks each image against minimum spec (resolution, aspect ratio, no watermarks) — flags non-compliant images
- Auto-generates SEO alt text for each image using intake data (e.g. "Sagrada Familia exterior facade at sunrise, Barcelona")
- Surfaces image count and quality status in the review screen

Copy generation does not begin until at least one approved image is uploaded or the associate explicitly bypasses this step.

---

### Step 4: Copy Generation

Once the structured data fields are resolved (or the associate overrides), the Content Generator and Structured Data Template Engine run in parallel.

The associate sees the generated listing in a **section-by-section view**:

- Title (primary + A/B variant)
- Short description (primary + A/B)
- Full description (4 sections, each with its header)
- Highlights (6 bullets)
- Inclusions / Exclusions
- FAQs (6–8)
- SEO title, meta description, tags
- Variant names and descriptions
- Structured data (JSON-LD preview)

Each section has a **Regenerate** button. Clicking it runs targeted regeneration on that section only, passing the Review Agent's fix instruction for that field as context. The rest of the listing is untouched.

---

### Step 5: Review Agent Verdict

The Review Agent runs automatically after copy generation. Its verdict is displayed inline:

- **Pass** — listing is ready for associate approval
- **Conditional pass** — ready for approval; warnings surfaced as improvement notes for next iteration
- **Fail** — specific blocking fields highlighted with the fix instruction. The associate can use per-section regeneration or edit inline.

The Review Agent verdict is authoritative. The content generator's self-check (publish_verdict) is not shown to the associate — only the Review Agent output is surfaced.

---

### Step 6: Associate Approval

The associate reviews the final listing and approves it. At approval, they choose:

- **Which variant to publish** (primary or A/B) — or both if the system supports split testing
- **Whether to publish immediately or schedule**

On approval:

1. Listing is pushed to the publish queue
2. Rosetta is triggered automatically with the target languages for this city/market (configured per city, not per listing)
3. The A/B test plan is logged to the experiment tracker for performance monitoring

---

### Step 7: Performance Feedback Loop

After a listing has been live for a meaningful period (configurable — default 30 days), the system pulls:

- GSC data: CTR, impressions, average position per listing URL
- A/B test results: which variant is converting

If a listing is underperforming relative to category benchmarks, it is automatically flagged for iteration. The associate can trigger a **Mode 2 run** — the Content Generator receives the existing copy + performance data and generates a new iteration, testing angles that haven't been explored yet.

---

## Pipeline Integration Map

```
[Associate uploads supplier data]
           │
           ▼
  [Duplicate Detection]
  ├── Duplicate found → Associate decides: merge or create new
  └── No duplicate → continue
           │
           ▼
  [Intake Agent — Agent 1]
           │
           ▼
  [Review Screen — Step 2]
  ├── Associate reviews flagged fields
  ├── Supplier email sent → supplier submits form → fields auto-resolved
  └── Associate resolves internal decisions
           │
           ▼
  [Image Upload — Step 3]
           │
           ▼
  [Content Generator — Agent 2]   ←── runs in parallel with ──►   [Template Engine]
           │                                                                │
           └───────────────────── orchestrator merges ──────────────────────┘
                                          │
                                          ▼
                                  [Review Agent — Agent 3]
                                          │
                             ┌────────────┴────────────┐
                           PASS                       FAIL
                             │                          │
                             │               [Section-level regen]
                             │               [max 2 attempts]
                             │                          │
                             │               ┌──────────┴──────────┐
                             │             PASS                  FAIL (2nd)
                             │               │                      │
                             │               │              [Human escalation]
                             └───────────────┘
                                          │
                                  [Associate Approval]
                                          │
                         ┌────────────────┼────────────────┐
                         ▼                ▼                ▼
                  [Publish queue]   [Rosetta trigger]  [A/B test logged]
                                          │
                                  [30-day performance check]
                                          │
                              [Mode 2 iteration if underperforming]
```

---

## Screens Summary

| Screen | Primary actor | Key actions |
|---|---|---|
| Ingestion | Associate | Paste text or upload CSV; review duplicate alert |
| Structured data review | Associate | Confirm / flag fields; send supplier email; edit inline |
| Supplier email preview | Associate | Review auto-drafted email before send |
| Image upload | Associate | Upload images; review alt text; flag non-compliant images |
| Copy review | Associate | Read generated copy section by section; regenerate per section; edit inline |
| Review verdict | Associate | See pass/fail status; view blockers with fix context |
| Approval | Associate | Choose variant; set publish timing |
| Performance dashboard | Associate / PM | See CTR, conversion per listing; trigger Mode 2 |

---

## Open Questions

| Question | Who decides |
|---|---|
| What are the target languages per city/market? (config for Rosetta trigger) | Content / localization team |
| What is the underperformance threshold for auto-flagging Mode 2? (e.g. CTR < category average by X%) | Data / analytics team |
| What approval hierarchy applies? (does any listing need a second approver?) | Catalog ops |
| Is the supplier clarification form hosted by Headout or via a third-party form tool? | Engineering |
| What is the canonical source for duplicate detection — the full catalog API or a dedicated similarity index? | Engineering |
| What image spec are minimums — resolution, aspect ratio, count? | Design / product |

---

## What This Replaces

| Current state | With this tool |
|---|---|
| Associate manually reads supplier PDF / email | Intake Agent structures it in < 60s |
| Associate writes copy from scratch | Content Generator produces a full draft in < 90s |
| Associate emails supplier, waits for reply, manually updates fields | Auto-email + structured form response auto-resolves fields |
| Copy goes through manual QA | Review Agent runs automatically — factual accuracy, voice, SEO |
| Translation handed off manually to localization team | Rosetta trigger fires automatically on approval |
| Listing performance reviewed manually if at all | 30-day auto-check; Mode 2 triggered for underperformers |
