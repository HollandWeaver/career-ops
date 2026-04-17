# Mode: auto-pipeline — Full Automatic Pipeline

When the user pastes a JD (text or URL) without an explicit sub-command, run the full pipeline in sequence:

## Step 0 — Company Dedup Check

**Before evaluating:** If the input includes a company name, scan `data/applications.md`. If an application to the same company already exists for a substantially different role, warn the user before continuing: "You already have an application to [Company] for [Prior Role]. Confirm you want to apply to [New Role] as well?"

## Step 0b — Extract JD

If the input is a **URL** (not pasted JD text), use this strategy to extract the content:

**Priority order:**

1. **Playwright (preferred):** Most job portals (Lever, Ashby, Greenhouse, Workday) are SPAs. Use `browser_navigate` + `browser_snapshot` to render and read the JD.
2. **WebFetch (fallback):** For static pages (ZipRecruiter, company career pages).
3. **WebSearch (last resort):** Search for role title + company on secondary portals that index JDs as static HTML.

**If no method works:** Ask the candidate to paste the JD manually or share a screenshot.

**If the input is JD text** (not a URL): use it directly, no fetch needed.

## Step 1 — Evaluation
Run exactly as the `oferta` mode (read `modes/oferta.md` for all blocks A-F).

## Step 1b — Score Gate

After Block B, check the match score:

- **< 75% (SKIP):** Save a minimal report (header + Blocks A + B). Log TSV with status `SKIP`. **Stop here** — skip Steps 2–4.
- **75–85% (T3/T4):** Continue to Steps 2–3. Skip Step 4 (draft answers).
- **> 85% (T1/T2):** Run full pipeline through Step 4.

## Step 2 — Save Report .md
Save the full evaluation to `reports/{###}-{company-slug}-{YYYY-MM-DD}.md` (see format in `modes/oferta.md`).

## Step 3 — Generate PDF
Run the full `pdf` pipeline (read `modes/pdf.md`).

## Step 3.5 — ATS Score Check

Run the ATS checker against the resume and JD. Read `modes/ats.md` for the full pipeline.

Read `modes/ats.md` and run the full ATS analysis inline. Append the `## H) ATS Score` section to the evaluation report saved in Step 2.

## Step 4 — Draft Application Answers (Tier 1 or Tier 2 only — match ≥ 91%)

If the match score is T1 or T2 (≥ 91%), generate draft answers for the application form:

1. **Extract form questions**: Use Playwright to navigate to the form and take a snapshot. If questions can't be extracted, use the generic questions below.
2. **Generate answers** following the tone guidelines below.
3. **Save to report** as section `## G) Draft Application Answers`.

### Generic questions (use if form questions can't be extracted)

- Why are you interested in this role?
- Why do you want to work at [Company]?
- Tell us about a relevant project or achievement
- What makes you a good fit for this position?
- How did you hear about this role?

### Answer Tone

**Position: "I'm choosing you."** The candidate has options and is choosing this company for concrete reasons.

**Tone rules:**
- **Confident, not arrogant**: "I've spent the past year building production AI agent systems — your role is where I want to apply that experience next"
- **Selective, not superior**: "I've been intentional about finding a team where I can contribute meaningfully from day one"
- **Specific and concrete**: Always reference something REAL from the JD or the company, and something REAL from the candidate's experience
- **Direct, no fluff**: 2-4 sentences per answer. No "I'm passionate about..." or "I would love the opportunity to..."
- **The hook is proof, not assertion**: Instead of "I'm great at X", say "I built X that does Y"

**Framework by question:**
- **Why this role?** → "Your [specific thing] maps directly to [specific thing I built]."
- **Why this company?** → Reference something concrete about the company. "I've been using [product] for [time/purpose]."
- **Relevant experience?** → One quantified proof point. "Built [X] that [metric]."
- **Good fit?** → "I sit at the intersection of [A] and [B], which is exactly where this role lives."
- **How did you hear?** → Honest: "Found through [portal/scan], evaluated against my criteria, and it scored highest."

**Language**: Always in the language of the JD (EN default).

## Step 5 — Update Tracker
Register in `data/applications.md` with all columns including Report and PDF status.

**If any step fails**, continue with the remaining steps and mark the failed step as pending in the tracker.
