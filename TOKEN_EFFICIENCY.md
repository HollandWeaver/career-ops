# Token Efficiency — career-ops

Best practices for keeping output quality high while minimizing token cost across interactive sessions, batch processing, and mode file development.

---

## Core Principles

1. **Gate depth behind score.** Don't run expensive blocks (comp research, STAR+R, CV plan) until you know the role passes. A SKIP should cost ~20% of a full eval.
2. **Scripts for deterministic work, LLM for judgment.** Report numbering, tracker merging, status normalization, PDF building — all scripts. The model handles analysis and writing only.
3. **Cross-reference, don't repeat.** One source of truth per rule. Mode files reference `_shared.md`; they don't duplicate it.
4. **Output format matches the consumer.** Structured JSON for scripts. Markdown for human reports. Never HTML when DOCX will do.

---

## Session Architecture

| Scenario | Method | Why |
|----------|--------|-----|
| 1–3 JDs, want feedback loop | Interactive (`/career-ops`) | Fast iteration, conversational refinement |
| 4+ JDs | Batch (`claude -p`) | Clean context per job, no accumulation, parallelizable |
| Portal scan / dedup triage | `claude -p --model haiku` | Only needs to classify URLs, no deep reasoning |
| Full evaluation | `claude -p --model sonnet` | Default quality bar |
| Negotiation, deep company research | Interactive with Opus | Judgment-heavy, benefits from highest capability |

**Session length rule:** In interactive mode, start a new session after 2–3 evaluations. Each prior evaluation carries forward as dead context that the model processes but doesn't need.

---

## Batch Processing

```bash
# Single worker
claude -p --model claude-sonnet-4-6 < batch/worker-input.txt

# Parallel workers (independent jobs — safe to run simultaneously)
claude -p < job1.txt > out1.json &
claude -p < job2.txt > out2.json &
claude -p < job3.txt > out3.json &
wait
```

- Each `claude -p` call gets a clean context — no session accumulation
- Playwright is not available in `-p` mode; mark reports as `Verification: unconfirmed (batch mode)`
- Workers output a JSON summary to stdout; the orchestrator parses it
- Run `node merge-tracker.mjs` after each batch, not after each job

---

## Tier-Gated Evaluation Depth

Already implemented in `oferta.md`, `auto-pipeline.md`, and `batch/batch-prompt.md`. The rule:

| Score | Blocks to run | Skip |
|-------|--------------|------|
| < 75% (SKIP) | A + B only | C, D, E, F, PDF/DOCX |
| 75–85% (T3/T4) | A + B + C + E | D (comp WebSearch), F (STAR+R) |
| > 85% (T1/T2) | All blocks | — |

Never run Block D (WebSearch) or Block F (STAR+R generation) for a role you won't apply to.

---

## File Loading Strategy

| File | Load when | Skip when |
|------|-----------|-----------|
| `cv.md` | Always for evaluation | — |
| `config/profile.yml` | Always for evaluation | — |
| `modes/_profile.md` | Always for evaluation | — |
| `modes/_shared.md` | Always for evaluation | — |
| `article-digest.md` | Generating DOCX/proof point writing | Score-only triage |
| `templates/cv-template.html` | Never (DOCX workflow replaces this) | — |
| `interview-prep/story-bank.md` | Block F only, check existing stories first | SKIP and T3/T4 |

### cv.md diet
`cv.md` loads on every single evaluation — its size directly multiplies token cost across all sessions. Keep it under 60 lines. Bullets only. No narrative prose. Metrics live in `article-digest.md`, not here.

---

## DOCX vs PDF

The DOCX workflow (`build_resume.mjs`) is significantly cheaper than the PDF workflow:

| Step | DOCX | PDF (deprecated) |
|------|------|-----------------|
| LLM output | ~100-line JSON (content only) | Full HTML with template fill |
| Formatting | `build_resume.mjs` handles deterministically | LLM generates CSS + layout |
| Rendering | Local Node.js (free) | Playwright headless browser |
| Edit feedback loop | Open in Word, edit, session learns changes | Re-render cycle required |

Always use DOCX. Generate PDF only if a specific application requires it.

---

## Mode File Design Rules

When writing or editing mode files:

**Prefer tables over prose.** A 5-row table communicates the same rules as 3 paragraphs and costs fewer tokens to generate responses from.

**Put the exit condition first.** The SKIP gate is now at the top of Block B. The model hits the most likely branch earliest and doesn't process downstream instructions for jobs it won't complete.

**Cross-reference, don't copy.** If a rule lives in `_shared.md`, write `See _shared.md for X` in other modes. Duplication means paying for the same tokens twice — once to load, once to process — on every evaluation.

**One file owns each rule.** Scoring formula: `_shared.md`. Comp targets: `_profile.md`. Archetype detection: `_shared.md`. If you're unsure where a rule lives, grep before adding.

**Remove human-reader commentary.** Inline explanations of *why* a rule exists are useful for humans editing the file, but the model doesn't need them to follow the rule. Move rationale to comments or a separate doc.

**Skip optional blocks by default.** Block F (STAR+R) and Block D (comp WebSearch) should require a positive signal to run, not a negative signal to skip.

---

## STAR+R Story Bank

`interview-prep/story-bank.md` accumulates reusable stories across evaluations. Before generating Block F for any role:

1. Check if `story-bank.md` has stories that already cover the JD's key requirements
2. Reuse and adapt existing stories — don't regenerate from scratch
3. Only write new stories for genuinely novel requirements

Over time this means Block F shrinks from generating 6–10 stories to adapting 2–3 existing ones. The bank compounds.

---

## _profile.md Maintenance

`_profile.md` loads on every evaluation. Keep each section purposeful:

- **Skills inventory:** The most valuable section — drives scoring accuracy. Keep current.
- **Archetype-to-proof-point mapping:** Used during Block B/E. Useful.
- **Comp reference:** Only needed at offer stage. Consider whether it needs to load for every triage eval.
- **Deal-breakers:** High value — early filter. Keep tight.
- **Narrative section:** Only needed when writing CV/cover letter content. Not needed for scoring.

If `_profile.md` grows significantly, consider splitting into `_profile-scoring.md` (always-load) and `_profile-writing.md` (load for DOCX/cover letter only).

---

## Output Discipline

**Ask for the action, not the explanation.** "Evaluate this JD" costs fewer tokens than "Explain your evaluation approach and then evaluate this JD."

**Don't ask for summaries of completed work.** The output is the summary. Avoid trailing "Here's what I did" recaps — they add tokens with no information value.

**Structured output for machine consumers.** When the output feeds a script (tracker merge, JSON parse), specify the exact format upfront. Ambiguous instructions produce verbose outputs that need cleanup.

**Minimal reports for SKIP.** A SKIP report needs: header, role summary (Block A), and the match table (Block B). Nothing else. The goal is a record, not a reference document.

---

## Diagnostic Commands

```bash
# Check pipeline health (report numbering, TSV format, status canonicality)
node verify-pipeline.mjs

# Merge pending tracker additions
node merge-tracker.mjs

# Normalize any non-canonical statuses
node normalize-statuses.mjs

# Check for duplicate entries
node dedup-tracker.mjs
```

Run these scripts instead of asking the model to audit the tracker. Scripts are deterministic and free.
