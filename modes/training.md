# Modo: training — Evaluación de Formación + JD Match Training

## Mode Detection

If the user provides a JD text or URL alongside their CV → run **Match Training** (section B).
If the user provides a course, certification, or program name → run **Course Evaluation** (section A).

---

## A) Course / Certification Evaluation

Para cada curso/cert que el candidato pregunte, evaluar 6 dimensiones:

| Dimensión | Qué evalúa |
|-----------|------------|
| Alineación North Star | ¿Acerca o aleja del objetivo? |
| Señal recruiter | ¿Qué piensan HMs al ver esto en un CV? |
| Tiempo y esfuerzo | Semanas × horas/semana |
| Coste de oportunidad | ¿Qué no puede hacer durante ese tiempo? |
| Riesgos | ¿Contenido outdated? ¿Brand débil? ¿Demasiado básico? |
| Entregable portfolio | ¿Produce un artefacto demostrable? |

### Veredictos

- **HACER** → plan de 4-12 semanas con entregables semanales y scoreboard
- **NO HACER** → alternativa mejor con justificación
- **HACER CON TIMEBOX** (máx X semanas) → plan condensado, solo lo esencial

### Prioridad

Formación que mejore credibilidad en "production-grade AI":
1. Evals y testing de LLMs
2. Observability y monitoring
3. Cost/reliability trade-offs
4. AI governance y safety
5. Enterprise AI architecture

---

## B) JD Match Training

**Purpose:** Practice and calibrate JD-to-CV matching so scoring is accurate, consistent, and at least as good as tools like Jobscan. Each round produces a scored match report + feedback on gaps between expected and actual scores.

### Input
- JD: paste text or provide URL
- Resume: read from `cv.md` (canonical) or the user can paste a specific tailored version
- (Optional) Target score to beat: e.g., "Jobscan gave this 72%"

### Step 1 — Extract JD requirements

Parse the JD into two tiers:

**Must-haves (Hard Requirements):**
- Specific tools/technologies explicitly required
- Years of experience or seniority level
- Degree requirements (if strict, not "or equivalent")
- Domain knowledge that can't be inferred

**Nice-to-haves (Soft Requirements):**
- "Preferred" or "plus" qualifications
- Adjacent skills
- Industry experience
- Soft skills

### Step 2 — Score each requirement against CV

For each requirement, assign:
- `Strong` — explicit CV evidence with specifics (tool named, metric included, project described)
- `Partial` — adjacent experience or implied coverage (similar tool, related domain)
- `Gap` — no CV evidence; would need "willingness to learn" framing
- `N/A` — experience level or degree checks (handle separately)

Output a match table:

| JD Requirement | CV Evidence | Strength |
|---|---|---|
| [requirement] | [specific CV line or project] | Strong / Partial / Gap |

### Step 3 — Calculate match score

```
Hard match score = (Strong × 1.0 + Partial × 0.5) / total hard requirements
Soft match score = (Strong × 1.0 + Partial × 0.5) / total soft requirements
Overall = (hard × 0.7) + (soft × 0.3)
```

Convert to 0–100% and 0–5 scale:
- 90–100% → 5.0 (exceptional fit)
- 80–89% → 4.5
- 70–79% → 4.0
- 60–69% → 3.5
- 50–59% → 3.0
- <50% → do not apply

### Step 4 — Gap mitigation

For each `Gap`, provide:
1. Is this a dealbreaker or tolerable?
2. One-sentence "willingness to learn" framing for cover/interview
3. Whether a quick project or cert could close it before the interview

### Step 5 — Calibration feedback (if user provides reference score)

If the user provides a Jobscan score or their own assessment:
- Compare: my score vs. reference
- If delta > 10 points: explain what I weighted differently
- Flag which requirements I may have over- or under-credited
- Update weighting logic if user confirms their assessment is more accurate

### Step 6 — Summary output

```
JD Match Report: [Company] — [Role]
Date: [today]

Overall Match: [XX]% ([X.X]/5)
Hard Requirements: [XX]% ([n] Strong, [n] Partial, [n] Gap)
Soft Requirements: [XX]% ([n] Strong, [n] Partial, [n] Gap)

Top 3 strengths:
1. [requirement] — [why it's strong]
2. ...
3. ...

Top 3 gaps to address:
1. [requirement] — [mitigation]
2. ...
3. ...

Recommendation: [Apply / Apply with cover letter / Skip]
```

### Training Protocol (multi-round calibration)

To build accuracy over multiple rounds:

1. Run match on 5+ JDs from the same archetype
2. After each round, user rates: "Score feels too high / too low / about right"
3. If consistent bias detected (always too high), adjust: partial = 0.4 instead of 0.5
4. Track calibration log in `interview-prep/match-calibration.md`

Format for calibration log:
```
| Date | JD | My Score | User Rating | Delta | Adjustment |
|------|----|----------|-------------|-------|------------|
```
