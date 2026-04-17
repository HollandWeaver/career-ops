# Mode: oferta — Full Evaluation

When the candidate pastes an offer (text or URL), deliver the following blocks in order:

## Step 0 — Archetype Detection (framing only, not scored)

Classify the offer into one of the archetypes (see `_shared.md`). If hybrid, indicate the 2 closest. This determines:
- Which proof points to prioritize in Block B
- How to reframe the summary in Block E
- Which STAR stories to prepare in Block F

## Block A — Role Summary

Table with:
- Detected archetype
- Domain (platform / agentic / LLMOps / ML / data / enterprise)
- Function (build / consult / manage / deploy)
- Seniority
- Remote (full / hybrid / on-site)
- Team size (if mentioned)
- TL;DR in 1 sentence

## Block B — CV Match + Score

Read `cv.md` and `article-digest.md`.

### Part 1: Extract and classify JD requirements

Separate into two lists:
- **Hard requirements** (must-have): tools explicitly required, years of experience, degree (if strict), domain knowledge the role clearly depends on
- **Soft requirements** (preferred / bonus): "nice to have", "plus", adjacent skills

### Part 2: Match table

For each requirement, map to exact evidence from the CV:

| JD Requirement | Type | CV Evidence | Match |
|---|---|---|---|
| [requirement] | Hard/Soft | [exact line or project] | Strong / Partial / Gap |

See `_shared.md` for match criteria definitions, score formula, and bucket thresholds.

### Part 3: Score + Tier Gate

Compute match % using the formula in `_shared.md`. Then:

| Score | Action |
|-------|--------|
| < 75% (SKIP) | **Stop here.** Save minimal report (header + A + B). Log TSV with status `SKIP`. Do not run C–F. |
| 75–85% (T3/T4) | Run C + E. Skip Block D (no comp WebSearch). Skip Block F unless user asks. |
| > 85% (T1/T2) | Run all blocks A–F. |

### Part 4: Gap mitigation

For each gap:
1. Hard blocker or nice-to-have?
2. Adjacent experience available?
3. Is there a portfolio project that covers this gap?
4. One-sentence mitigation framing for cover letter or interview

## Block C — Level & Positioning Strategy

1. **Level detected** in the JD vs candidate's actual level
2. **How to position the experience**: specific phrases, concrete achievements to highlight
3. **If seniority gap**: accept if match is high; negotiate 6-month review with explicit promotion criteria

## Block D — Comp & Demand (informational — does not affect score)

Use WebSearch for:
- Current salaries for the role (Glassdoor, Levels.fyi, Blind)
- Company's comp reputation
- Demand trend for the role

Table with data and cited sources. If no data exists, say so rather than guessing. Compare against `modes/_profile.md` comp reference only for future offer context.

## Block E — CV Personalization Plan

| # | Section | Current state | Proposed change | Why |
|---|---------|---------------|-----------------|-----|
| 1 | Summary | ... | ... | ... |
| ... | ... | ... | ... | ... |

Top 5 changes to CV + top 5 changes to LinkedIn to maximize match.

## Block F — Interview Prep (STAR+R)

6-10 STAR+R stories mapped to JD requirements (STAR + **Reflection**):

| # | JD Requirement | STAR+R Story | S | T | A | R | Reflection |
|---|----------------|-------------|---|---|---|---|------------|

The **Reflection** column captures what was learned or what would be done differently. This signals seniority — junior candidates describe what happened; senior candidates extract lessons.

**Story Bank:** If `interview-prep/story-bank.md` exists, check if any of these stories are already there. If not, append new ones. Over time this builds a reusable bank of 5-10 master stories that can be adapted to any interview question.

**Framed by archetype:**
- AI Platform / LLMOps → emphasize evals, observability, production metrics
- Agentic / Automation → emphasize orchestration, error handling, HITL
- Data Engineering → emphasize scale, quality, lineage, testing
- Solutions Architect → emphasize system design decisions
- Technical AI PM → emphasize discovery, trade-offs, stakeholder communication
- Forward Deployed → emphasize fast delivery, client-facing impact

Also include:
- 1 recommended case study (which project to lead with and how to frame it)
- Red-flag Q&A (e.g., "Your degree is Economics, not CS — how do you handle technical depth?")

---

## Post-Evaluation

**ALWAYS** after generating Blocks A-F:

### 1. Save report .md

Save the full evaluation to `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`.

- `{###}` = next sequential number (3 digits, zero-padded)
- `{company-slug}` = company name in lowercase, no spaces (use hyphens)
- `{YYYY-MM-DD}` = today's date

**Report format:**

```markdown
# Evaluation: {Company} — {Role}

**Date:** {YYYY-MM-DD}
**Archetype:** {detected}
**Match:** {XX}% ({TN})
**URL:** {offer URL}
**PDF:** {path or pending}

---

## A) Role Summary
(full Block A content)

## B) CV Match
(full Block B content — requirements table + match % + bucket)

## C) Level & Positioning Strategy
(full Block C content)

## D) Comp & Demand (informational)
(full Block D content)

## E) CV Personalization Plan
(full Block E content)

## F) Interview Prep (STAR+R)
(full Block F content)

## G) Draft Application Answers
(only if T1 or T2 — match ≥ 91%)

---

## Keywords Extracted
(15-20 keywords from JD for ATS optimization)

## Skill Map Data
```json
{
  "title": "{role title}",
  "company": "{company}",
  "seniority": "{analyst|de-1|de-2|senior|staff|principal}",
  "years_min": null,
  "years_max": null,
  "salary_min": null,
  "salary_max": null,
  "remote": true,
  "domain": "{healthcare|fintech|adtech|govtech|edtech|general}",
  "url": "{url}",
  "match_score": 0,
  "report_num": 0,
  "hard_skills": [
    {"name": "{skill}", "position": 1}
  ],
  "soft_skills": [
    {"name": "{skill}", "position": 1}
  ]
}
```
*Run `node jd-ingest.mjs '<json>'` to add this to the skill map database.*
```

### 2. Register in tracker

**ALWAYS** register via TSV in `batch/tracker-additions/`:
- Next sequential number
- Today's date
- Company
- Role
- Score: format `XX% (TN)` — e.g., `87% (T3)`
- Status: `Evaluated`
- PDF: ❌ (or ✅ if auto-pipeline generated PDF)
- Report: relative link to the report .md

**Tracker format:**

```markdown
| # | Date | Company | Role | Score | Status | PDF | Report | Notes |
```
