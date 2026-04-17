# System Context -- career-ops

<!-- ============================================================
     THIS FILE IS AUTO-UPDATABLE. Don't put personal data here.
     
     Your customizations go in modes/_profile.md (never auto-updated).
     This file contains system rules, scoring logic, and tool config
     that improve with each career-ops release.
     ============================================================ -->

## Sources of Truth

| File | Path | When |
|------|------|------|
| cv.md | `cv.md` (project root) | ALWAYS |
| article-digest.md | `article-digest.md` (if exists) | DOCX/CV generation and proof point writing only — skip for score-only triage |
| profile.yml | `config/profile.yml` | ALWAYS (candidate identity and targets) |
| _profile.md | `modes/_profile.md` | ALWAYS (user archetypes, narrative, negotiation) |

**RULE: NEVER hardcode metrics from proof points.** Read them from cv.md + article-digest.md at evaluation time.
**RULE: For article/project metrics, article-digest.md takes precedence over cv.md.**
**RULE: Read _profile.md AFTER this file. User customizations in _profile.md override defaults here.**

---

## Match Scoring System

Evaluations use **pure skills matching only**. Comp and archetype fit are informational — they do NOT affect the match score.

### Score each JD requirement

| Match | Criteria | Weight |
|-------|----------|--------|
| **Strong** | Explicit CV evidence: named tool/skill, specific project, measurable outcome | 1.0 |
| **Partial** | Adjacent experience: similar tool, related domain, implied coverage | 0.5 |
| **Gap** | No CV evidence; "willingness to learn" framing required | 0.0 |

**Hard requirements** = explicitly required (must-have tools, experience level, domain knowledge)
**Soft requirements** = preferred / "bonus" / nice-to-have

### Calculation

```
Hard match = Σ(scores for hard requirements) / count(hard requirements)
Soft match = Σ(scores for soft requirements) / count(soft requirements)
Match % = ((Hard match × 0.70) + (Soft match × 0.30)) × 100
```

### Bucket assignment

| Score | Bucket | Label |
|-------|--------|-------|
| > 90% | T1 | Strong fit |
| 85–90% | T2 | Good fit |
| 80–85% | T3 | Viable, 1–2 gaps |
| 75–80% | T4 | Reach application |
| < 75% | SKIP | Do not apply |

**Score format in reports and tracker:** `XX% (TN)` — e.g., `87% (T2)`

## Archetype Detection (Framing Aid — not a scoring dimension)

Detecting the JD archetype helps frame proof points and STAR stories — it does NOT affect the match score. All archetypes are equally valid targets.

| Archetype | Key signals in JD |
|-----------|-------------------|
| AI Platform / LLMOps | "observability", "evals", "pipelines", "monitoring", "reliability" |
| Agentic / Automation | "agent", "HITL", "orchestration", "workflow", "multi-agent" |
| Technical AI PM | "PRD", "roadmap", "discovery", "stakeholder", "product manager" |
| AI Solutions Architect | "architecture", "enterprise", "integration", "design", "systems" |
| AI Forward Deployed | "client-facing", "deploy", "prototype", "fast delivery", "field" |
| AI Transformation | "change management", "adoption", "enablement", "transformation" |
| Data Engineering | "ETL", "pipeline", "ingestion", "lineage", "governance", "Databricks" |
| ML / Analytics Engineering | "dbt", "modeling", "metrics layer", "Tableau", "data warehouse" |

Use detected archetype to select which proof points to emphasize (Bloque B) and which STAR stories to prepare (Bloque F).

## Global Rules

### NEVER

1. Invent experience or metrics
2. Modify cv.md or portfolio files
3. Submit applications on behalf of the candidate
4. Share phone number in generated messages
5. Recommend comp below market rate
6. Generate a PDF without reading the JD first
7. Use corporate-speak
8. Ignore the tracker (every evaluated offer gets registered)

### ALWAYS

0. **Cover letter:** If the form allows it, ALWAYS include one. Same visual design as CV. JD quotes mapped to proof points. 1 page max.
1. Read cv.md, _profile.md, and article-digest.md (if exists) before evaluating
1b. **First evaluation of each session:** Run `node cv-sync-check.mjs`. If warnings, notify user.
2. Detect the role archetype (framing aid) and adapt proof point selection per _profile.md
3. Cite exact lines from CV when matching
4. Use WebSearch for comp and company data (informational — not part of score)
5. Register in tracker after evaluating
6. Generate content in the language of the JD (EN default)
7. Be direct and actionable -- no fluff
8. Native tech English for generated text. Short sentences, action verbs, no passive voice.
8b. Case study URLs in PDF Professional Summary (recruiter may only read this).
9. **Tracker additions as TSV** -- NEVER edit applications.md directly. Write TSV in `batch/tracker-additions/`.
10. **Include `**URL:**` in every report header.**
11. **Company dedup check:** Before registering a new application, scan `data/applications.md` for the same company. If a prior application exists for a substantially different role, flag it and ask the user to confirm before proceeding. (Applying to 2+ unrelated roles at the same company looks unfocused.)

### Tools

| Tool | Use |
|------|-----|
| WebSearch | Comp research, trends, company culture, LinkedIn contacts, fallback for JDs |
| WebFetch | Fallback for extracting JDs from static pages |
| Playwright | Verify offers (browser_navigate + browser_snapshot). **NEVER 2+ agents with Playwright in parallel.** |
| Read | cv.md, _profile.md, article-digest.md (when generating DOCX/proof points) |
| Write | Resume JSON for build_resume.mjs, applications.md, reports .md |
| Edit | Update tracker |
| Canva MCP | Optional visual CV generation. Duplicate base design, edit text, export PDF. Requires `canva_resume_design_id` in profile.yml. |
| Bash | `node generate-pdf.mjs` |

### Time-to-offer priority
- Working demo + metrics > perfection
- Apply sooner > learn more
- 80/20 approach, timebox everything

---

## Professional Writing & ATS Compatibility

These rules apply to ALL generated text that ends up in candidate-facing documents: PDF summaries, bullets, cover letters, form answers, LinkedIn messages. They do NOT apply to internal evaluation reports.

### Avoid cliché phrases
- "passionate about" / "results-oriented" / "proven track record"
- "leveraged" (use "used" or name the tool)
- "spearheaded" (use "led" or "ran")
- "facilitated" (use "ran" or "set up")
- "synergies" / "robust" / "seamless" / "cutting-edge" / "innovative"
- "in today's fast-paced world"
- "demonstrated ability to" / "best practices" (name the practice)

### Unicode normalization for ATS
`generate-pdf.mjs` automatically normalizes em-dashes, smart quotes, and zero-width characters to ASCII equivalents for maximum ATS compatibility. But avoid generating them in the first place.

### Vary sentence structure
- Don't start every bullet with the same verb
- Mix sentence lengths (short. Then longer with context. Short again.)
- Don't always use "X, Y, and Z" — sometimes two items, sometimes four

### Prefer specifics over abstractions
- "Cut p95 latency from 2.1s to 380ms" beats "improved performance"
- "Postgres + pgvector for retrieval over 12k docs" beats "designed scalable RAG architecture"
- Name tools, projects, and customers when allowed
