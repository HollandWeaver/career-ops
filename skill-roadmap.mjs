/**
 * skill-roadmap.mjs
 *
 * Reads data/skill-map.db and outputs:
 *   A) Skill frequency table by seniority tier
 *   B) Holland's gap analysis vs. each tier
 *   C) Ranked learning roadmap (Tier 1 / Tier 2 / Tier 3)
 *
 * Usage:
 *   node skill-roadmap.mjs               → print to stdout + write data/roadmap-{date}.md
 *   node skill-roadmap.mjs --stdout       → stdout only
 *   node skill-roadmap.mjs --json         → raw JSON output
 */

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const DB_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "data", "skill-map.db");

// ── Holland's current skills (synced with modes/_profile.md Strong list) ──────
// Update this as skills are acquired. canonical_name format.
const HOLLAND_SKILLS = new Set([
  "sql", "pyspark", "python", "databricks", "azure-devops", "git",
  "etl", "data-quality", "data-governance", "data-lineage",
  "agile", "collaboration", "communication",
  "rag", "llm", "llm-api", "data-modeling",
  "tableau", "delta-lake",
]);

const SENIORITY_ORDER = ["analyst", "de-1", "de-2", "senior", "staff"];

const SENIORITY_LABELS = {
  analyst:   "Data Analyst",
  "de-1":    "DE I (Junior)",
  "de-2":    "DE II (Mid)",
  senior:    "Senior DE",
  staff:     "Staff / Principal",
};

// ── Main ──────────────────────────────────────────────────────────────────────

if (!fs.existsSync(DB_PATH)) {
  console.error(`Database not found at ${DB_PATH}. Run node jd-ingest.mjs first.`);
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

// Count postings per seniority
const postingCounts = {};
for (const tier of SENIORITY_ORDER) {
  const row = db.prepare(`SELECT COUNT(*) as n FROM job_postings WHERE seniority = ?`).get(tier);
  postingCounts[tier] = row.n;
}
const totalPostings = Object.values(postingCounts).reduce((a, b) => a + b, 0);

if (totalPostings === 0) {
  console.log("No job postings in the database yet. Run node jd-ingest.mjs to add data.");
  process.exit(0);
}

// Get all skills with posting frequency per seniority
const allSkills = db.prepare(`SELECT canonical_name, category FROM skills ORDER BY canonical_name`).all();

// Build frequency table: skill → { tier → { hard_pct, soft_pct, any_pct, avg_position } }
const freqTable = {};

for (const { canonical_name, category } of allSkills) {
  freqTable[canonical_name] = { category, tiers: {} };

  for (const tier of SENIORITY_ORDER) {
    const n = postingCounts[tier];
    if (n === 0) { freqTable[canonical_name].tiers[tier] = null; continue; }

    const hardRow = db.prepare(`
      SELECT COUNT(DISTINCT jp.id) as cnt, AVG(js.list_position) as avg_pos
      FROM job_postings jp
      JOIN job_skills js ON js.job_id = jp.id
      JOIN skills s ON s.id = js.skill_id
      WHERE jp.seniority = ? AND s.canonical_name = ? AND js.requirement_type = 'hard'
    `).get(tier, canonical_name);

    const softRow = db.prepare(`
      SELECT COUNT(DISTINCT jp.id) as cnt
      FROM job_postings jp
      JOIN job_skills js ON js.job_id = jp.id
      JOIN skills s ON s.id = js.skill_id
      WHERE jp.seniority = ? AND s.canonical_name = ? AND js.requirement_type = 'soft'
    `).get(tier, canonical_name);

    const hardCnt = hardRow.cnt ?? 0;
    const softCnt = softRow.cnt ?? 0;
    const anyCnt = Math.min(n, hardCnt + softCnt); // cap at tier posting count

    freqTable[canonical_name].tiers[tier] = {
      hard_pct: Math.round((hardCnt / n) * 100),
      soft_pct: Math.round((softCnt / n) * 100),
      any_pct:  Math.round((anyCnt / n) * 100),
      avg_pos:  hardRow.avg_pos ? Math.round(hardRow.avg_pos * 10) / 10 : null,
      hard_cnt: hardCnt,
      n,
    };
  }
}

// ── Format output ─────────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);
const lines = [];

lines.push(`# Skill Map — Job Market Intelligence`);
lines.push(`**Generated:** ${today} | **Postings in DB:** ${totalPostings}`);
lines.push(``);

// Posting counts by tier
lines.push(`## Database Summary`);
lines.push(``);
lines.push(`| Tier | Postings |`);
lines.push(`|---|---|`);
for (const tier of SENIORITY_ORDER) {
  lines.push(`| ${SENIORITY_LABELS[tier]} | ${postingCounts[tier]} |`);
}
lines.push(``);

// ── A) Frequency table ────────────────────────────────────────────────────────

lines.push(`## A) Skill Frequency by Seniority Tier`);
lines.push(``);
lines.push(`Format: hard% (soft%) — hard = explicitly required, soft = preferred/bonus`);
lines.push(``);

// Only show skills that appear in at least 1 posting
const activeSkills = allSkills.filter(({ canonical_name }) =>
  SENIORITY_ORDER.some(tier => (freqTable[canonical_name].tiers[tier]?.any_pct ?? 0) > 0)
);

// Sort by overall frequency (sum of hard_pct across tiers)
activeSkills.sort((a, b) => {
  const sumA = SENIORITY_ORDER.reduce((s, t) => s + (freqTable[a.canonical_name].tiers[t]?.hard_pct ?? 0), 0);
  const sumB = SENIORITY_ORDER.reduce((s, t) => s + (freqTable[b.canonical_name].tiers[t]?.hard_pct ?? 0), 0);
  return sumB - sumA;
});

const colW = 16;
const pad = (s, w) => String(s).padEnd(w);

const header = `| ${pad("Skill", 22)} | ${SENIORITY_ORDER.map(t => pad(SENIORITY_LABELS[t], colW)).join(" | ")} |`;
const sep    = `|${"-".repeat(24)}|${SENIORITY_ORDER.map(() => "-".repeat(colW + 2)).join("|")}|`;
lines.push(header);
lines.push(sep);

for (const { canonical_name } of activeSkills) {
  const have = HOLLAND_SKILLS.has(canonical_name) ? "✅ " : "   ";
  const cols = SENIORITY_ORDER.map(tier => {
    const t = freqTable[canonical_name].tiers[tier];
    if (!t || t.n === 0) return pad("—", colW);
    if (t.any_pct === 0) return pad("—", colW);
    const soft = t.soft_pct > 0 ? ` (+${t.soft_pct}%)` : "";
    return pad(`${t.hard_pct}%${soft}`, colW);
  });
  lines.push(`| ${have}${pad(canonical_name, 20)} | ${cols.join(" | ")} |`);
}
lines.push(``);

// ── B) Gap analysis per tier ──────────────────────────────────────────────────

lines.push(`## B) Gap Analysis — Holland vs. Each Tier`);
lines.push(``);

for (const tier of SENIORITY_ORDER) {
  const n = postingCounts[tier];
  if (n === 0) continue;

  lines.push(`### ${SENIORITY_LABELS[tier]} (${n} postings)`);
  lines.push(``);

  const have = [], gaps = [];
  for (const { canonical_name } of activeSkills) {
    const t = freqTable[canonical_name].tiers[tier];
    if (!t || t.hard_pct === 0) continue;
    if (HOLLAND_SKILLS.has(canonical_name)) {
      have.push({ name: canonical_name, pct: t.hard_pct });
    } else {
      gaps.push({ name: canonical_name, pct: t.hard_pct, pos: t.avg_pos });
    }
  }

  // Estimated qualification rate: % of postings where all hard requirements above 40% are met
  const hardThreshold40 = activeSkills.filter(({ canonical_name }) => {
    const t = freqTable[canonical_name].tiers[tier];
    return t && t.hard_pct >= 40;
  });
  const missingCritical = hardThreshold40.filter(({ canonical_name }) => !HOLLAND_SKILLS.has(canonical_name));

  lines.push(`**Matched hard requirements (≥20% frequency):**`);
  if (have.length) {
    have.forEach(({ name, pct }) => lines.push(`- ✅ \`${name}\` — ${pct}% of postings`));
  } else {
    lines.push(`- (none)`);
  }
  lines.push(``);

  lines.push(`**Gaps (hard requirements ≥20% frequency, not in your toolkit):**`);
  if (gaps.length) {
    gaps.sort((a, b) => b.pct - a.pct);
    gaps.forEach(({ name, pct, pos }) => {
      const posStr = pos ? ` | avg position: #${pos}` : "";
      lines.push(`- ⚠️ \`${name}\` — ${pct}% of postings${posStr}`);
    });
  } else {
    lines.push(`- (none — you cover all frequent hard requirements for this tier!)`);
  }
  lines.push(``);

  if (missingCritical.length === 0) {
    lines.push(`**Estimated qualification rate: high** (you cover all skills appearing in ≥40% of postings)`);
  } else {
    lines.push(`**Critical gaps** (appear in ≥40% of postings): ${missingCritical.map(s => `\`${s.canonical_name}\``).join(", ")}`);
  }
  lines.push(``);
}

// ── C) Learning roadmap ───────────────────────────────────────────────────────

lines.push(`## C) Recommended Learning Roadmap`);
lines.push(``);
lines.push(`Target tier: **DE II (Mid)** — current estimated level based on 3 years experience.`);
lines.push(``);

// Score each gap skill: hard_pct × (1 / avg_position) × hard_requirement_bonus
const targetTier = "de-2";
const gapSkills = activeSkills
  .filter(({ canonical_name }) => !HOLLAND_SKILLS.has(canonical_name))
  .map(({ canonical_name, category }) => {
    const t = freqTable[canonical_name].tiers[targetTier];
    const seniorT = freqTable[canonical_name].tiers["senior"];
    if (!t) return null;
    const posWeight = t.avg_pos ? (1 / t.avg_pos) : 0.1;
    const score = (t.hard_pct * posWeight) + (t.soft_pct * posWeight * 0.3);
    return { name: canonical_name, category, score: Math.round(score * 10) / 10,
             de2_hard: t.hard_pct, de2_soft: t.soft_pct,
             senior_hard: seniorT?.hard_pct ?? 0 };
  })
  .filter(Boolean)
  .sort((a, b) => b.score - a.score);

const tier1 = gapSkills.filter(s => s.de2_hard >= 40);
const tier2 = gapSkills.filter(s => s.de2_hard >= 15 && s.de2_hard < 40);
const tier3 = gapSkills.filter(s => s.de2_hard < 15 && (s.senior_hard >= 30 || s.de2_soft >= 20));

lines.push(`### Tier 1 — Learn Now (appear in ≥40% of DE II hard requirements)`);
lines.push(``);
if (tier1.length === 0) {
  lines.push(`No critical DE II gaps — you cover the major hard requirements. Move to Tier 2.`);
} else {
  tier1.forEach(({ name, de2_hard, senior_hard, score }) => {
    lines.push(`- **\`${name}\`** — ${de2_hard}% of DE II postings | ${senior_hard}% of Senior | priority score: ${score}`);
  });
}
lines.push(``);

lines.push(`### Tier 2 — Learn Next (15–39% of DE II hard requirements)`);
lines.push(``);
if (tier2.length === 0) {
  lines.push(`(none)`);
} else {
  tier2.forEach(({ name, de2_hard, senior_hard }) => {
    lines.push(`- **\`${name}\`** — ${de2_hard}% of DE II | ${senior_hard}% of Senior`);
  });
}
lines.push(``);

lines.push(`### Tier 3 — Learn Later (Senior+ signal or soft-only at DE II)`);
lines.push(``);
if (tier3.length === 0) {
  lines.push(`(none)`);
} else {
  tier3.forEach(({ name, de2_hard, senior_hard, de2_soft }) => {
    lines.push(`- **\`${name}\`** — ${de2_hard}% hard / ${de2_soft}% soft at DE II | ${senior_hard}% Senior`);
  });
}
lines.push(``);

lines.push(`---`);
lines.push(`*Data is only as good as the JDs ingested. Run \`node jd-ingest.mjs\` after each evaluation to keep this current.*`);

// ── Output ────────────────────────────────────────────────────────────────────

const output = lines.join("\n");

const args = process.argv.slice(2);
const stdoutOnly = args.includes("--stdout");
const jsonMode = args.includes("--json");

if (jsonMode) {
  console.log(JSON.stringify({ freqTable, gapSkills, postingCounts }, null, 2));
} else {
  console.log(output);
  if (!stdoutOnly) {
    const outPath = `data/roadmap-${today}.md`;
    fs.writeFileSync(outPath, output, "utf8");
    console.error(`\n✓ Written to ${outPath}`);
  }
}

db.close();
