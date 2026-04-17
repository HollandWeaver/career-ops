# Mode: roadmap — Skill Map & Career Roadmap

When the user invokes `/career-ops roadmap`, execute the following:

## Step 1 — Run the analysis script

```bash
node skill-roadmap.mjs --stdout
```

Capture the output. If the database is empty or missing, tell the user to run `node jd-ingest.mjs` after evaluating a few JDs first.

## Step 2 — Interpret the output

Read the frequency table and roadmap sections and provide a human-readable summary:

### Summary to provide:

**1. Current standing**
- How many JDs are in the DB (note: data improves after 30+ JDs)
- What tier the data covers (analyst / DE II / senior — and which have no data yet)
- Which of Holland's current skills are most validated by market data

**2. Critical gap (Tier 1)**
- The single most important skill to learn next — the one appearing in ≥40% of target-tier hard requirements that Holland doesn't have
- Why it matters (what % of postings it unlocks)
- Suggested project to close it (something buildable in 2-4 weeks that could go on the resume)

**3. Learning order (Tier 1 → Tier 2 → Tier 3)**
- Prioritized list from the roadmap output
- For each Tier 1 and Tier 2 skill: name a concrete project or resource
  - AWS: build a pipeline using S3 + Lambda or Glue — document it on GitHub
  - dbt: add a dbt transformation layer to an existing SQL project
  - Airflow: orchestrate an existing ETL with Airflow DAGs (local or Astro Cloud)
  - Azure: deploy a Databricks workspace on Azure, wire it to blob storage
  - Docker: containerize one of the existing FastAPI projects
  - Snowflake: replicate an existing pipeline using Snowflake free tier

**4. Honest qualification rate estimate**
- Based on current skills vs. the frequency table: "You likely qualify for X% of DE II postings we've seen"
- What adding Tier 1 skill would do to that rate

## Step 3 — Write output

Save the roadmap to `data/roadmap-{YYYY-MM-DD}.md`.

Tell the user the path.

## Step 4 — Offer next actions

- "Want me to find a project idea to close the [Tier 1 gap] this weekend?"
- "Want me to search for DE I or Data Quality Analyst postings that match your current stack?"
- "Want to ingest more JDs to improve the data? Paste any JD and I'll add it."

---

## Notes

- The frequency table is only meaningful with 30+ JDs. With 10-15, treat it as directional signal, not statistical truth.
- Skill ingestion happens via `node jd-ingest.mjs` — the `## Skill Map Data` block in evaluation reports contains the pre-formatted JSON.
- Holland's current skills are hardcoded in `skill-roadmap.mjs` (HOLLAND_SKILLS set). Update that set when new skills are added to `modes/_profile.md`.
