# Mode: ats — ATS Score Check

Estimate how well the current resume will score against a job description, identify keyword gaps, and optionally apply honest improvements until the score hits 92%+.

Claude performs this analysis directly — no external script or API key required.

## When to run

- **Automatically**: called from `auto-pipeline` Step 3.5 after PDF generation
- **Manually**: user invokes `/career-ops ats`

## What you need

- Resume content: read `resume-schema.json` (or whichever schema was used to build the last resume)
- JD text: from current context (evaluation report, pasted text, or already-fetched URL)
- Background docs: read `cv.md` and `article-digest.md` for honest verification

## Analysis pipeline

### Step 1 — Extract candidate info

Read `resume-schema.json`:
- Candidate name: `header.first_name + " " + header.last_name` (never hardcoded)
- Flatten resume to plain text: summary, all bullets (strip `**`), all skill lines

### Step 2 — Extract JD terms

From the JD, extract 20–30 key terms across these categories:
- `required_skill` — must-have tools, languages, platforms
- `preferred_skill` — nice-to-have
- `terminology` — domain words, methodologies, frameworks
- `soft` — communication style, cross-functional, stakeholder language
- `title` — exact words from the role title

### Step 3 — Classify each term against the resume

For each term, assign one status:

| Status | Weight | Rule |
|---|---|---|
| `EXACT` | 1.0 | Term string appears verbatim in flattened resume |
| `SEMANTIC` | 0.7 | Concept present but phrased differently — note the resume phrase |
| `HONEST-ADD` | 0.0 now | Not in resume but verifiable in `cv.md` or `article-digest.md` — cite the exact source line |
| `GAP` | 0.0 | Not in candidate background — **never recommend adding** |

HONEST-ADD requires a source citation. If you cannot find it in cv.md or article-digest.md, it is a GAP.

### Step 4 — Score

```
keyword_score    = sum(term weights) / total_terms × 100
structural_score = average of 6 structural factors (0–100 each):
  - title_alignment:       work history progression vs. target role
  - recency:               relevant skills in recent jobs, not buried in old roles
  - years_signal:          resume signals the right experience band for JD seniority
  - keyword_distribution:  top keywords appear in Summary + first bullet of each role + Skills
  - synonym_coverage:      both acronym and full form present where JD uses both
  - required_vs_preferred: gaps on required vs. preferred skills are appropriately weighted

final_ats_score = (keyword_score × 0.60) + (structural_score × 0.40)
honest_ceiling  = score if all HONEST-ADD terms were added (treat as weight 1.0)
```

### Step 5 — Output the report section

Output exactly this format as `## H) ATS Score`:

```markdown
## H) ATS Score

**Candidate:** {name}
**Estimated ATS Score:** {emoji} **{score}%** — {✅ Target met (92%+) | ⚠️ Target: 92%+ — gap: Xpts}
**Keyword Coverage:** {kwScore}% ({matched}/{total} terms matched)
**Structural Score:** {strScore}/100
**Honest Ceiling:** {ceiling}% (with all honest additions applied)

### Present Keywords
✅ **EXACT:** `term1`, `term2`, ...
🔵 **SEMANTIC:** `term` (~*resume phrase*), ...

### Gaps
🟡 **HONEST-ADD** — in background, not yet in resume:
  - `term` — *exact source citation from cv.md or article-digest.md*

🔴 **GAP** — not in background, do not add:
  - `term1`, `term2`, ...

### Structural Analysis
- ✅/⚠️/❌ **Title Alignment** (XX/100): note
- ✅/⚠️/❌ **Recency** (XX/100): note
- ✅/⚠️/❌ **Years Signal** (XX/100): note
- ✅/⚠️/❌ **Keyword Distribution** (XX/100): note
- ✅/⚠️/❌ **Synonym Coverage** (XX/100): note
- ✅/⚠️/❌ **Required Vs Preferred** (XX/100): note

### Recommended Honest Additions
**`term`** → `placement` (e.g., skills:Data Engineering & SQL)
> suggested phrasing in context
*Source: exact citation*

### Honest Ceiling
Score capped at ~{ceiling}% without fabrication. Remaining gaps are genuine skill gaps:
`term1`, `term2`

### Notes
{any other observations}
```

Score emoji: 🟢 ≥92%, 🟡 80–91%, 🔴 <80%

### Step 6 — Recursive improvement loop (if score < 92% and HONEST-ADD terms exist, max 3 iterations)

For each iteration:
1. Apply each HONEST-ADD naturally into `resume-schema.json` at the suggested placement
   - Verify each against `cv.md` / `article-digest.md` before applying
   - Natural injection only — no invented experience, no new claims
2. Rebuild the DOCX:
   ```bash
   node build_resume.mjs resume-schema.json "output/{Candidate Name} resume {Company} {Role}.docx"
   ```
3. Re-run the full analysis (Steps 1–5) against the updated resume
4. Exit loop when: score ≥ 92% OR no HONEST-ADD terms remain

After the loop, note the final score and iterations run in the report.

### Step 7 — Save and append

- If called from `auto-pipeline`: append `## H) ATS Score` to the evaluation report at `reports/{###}-{slug}-{date}.md`
- If called standalone (`/career-ops ats`): print the section and optionally save to `output/{first-last}-ats-{date}.md`

## Profile adaptability

Candidate name always comes from `resume-schema.json` → `header.first_name + header.last_name`. Never hardcoded. If a different schema is passed (e.g., for Jonathan Honeycutt), the report auto-adapts.
