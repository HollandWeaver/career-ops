#!/usr/bin/env node
/**
 * fetch-jd.mjs — Fetch a JS-rendered job posting and save to jds/
 *
 * Usage:
 *   node fetch-jd.mjs <url>
 *   node fetch-jd.mjs <url> --dry-run   → print extracted text, don't save
 *
 * Launches headless Chromium via Playwright, waits for the page to render,
 * extracts the job content, saves it as jds/<Company_Job_Title.md>, then
 * immediately ingests it into the skill-map DB.
 */

import { chromium } from "playwright";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JDS_DIR = path.join(__dirname, "jds");

const args = process.argv.slice(2);
const url = args.find(a => a.startsWith("http"));
const DRY_RUN = args.includes("--dry-run");

if (!url) {
  console.error("Usage: node fetch-jd.mjs <url> [--dry-run]");
  process.exit(1);
}

// ── Filename sanitizer ────────────────────────────────────────────────────────

function toFilename(company, title) {
  const clean = (s) =>
    s.trim()
      .replace(/\s+-\s+/g, "_")   // " - " → "_"
      .replace(/[-\s]+/g, "_")    // hyphens and spaces → "_"
      .replace(/[^a-zA-Z0-9_]/g, "") // strip anything else
      .replace(/_+/g, "_");        // collapse multiple underscores
  return `${clean(company)}_${clean(title)}.md`;
}

// ── Claude extraction (same as ingest-jds-folder.mjs) ────────────────────────

const SYSTEM_PROMPT = `You extract structured skill data from job descriptions for a career intelligence database.

Return ONLY a valid JSON object matching this exact schema — no markdown, no explanation:

{
  "title": "exact job title from JD",
  "company": "company name",
  "seniority": "analyst|de-1|de-2|senior|staff|principal",
  "years_min": number or null,
  "years_max": number or null,
  "salary_min": number or null,
  "salary_max": number or null,
  "remote": true|false,
  "domain": "healthcare|fintech|adtech|govtech|edtech|general",
  "url": "${url}",
  "match_score": null,
  "report_num": null,
  "hard_skills": [{"name": "skill name", "position": 1}, ...],
  "soft_skills": [{"name": "skill name", "position": 1}, ...]
}

Rules:
- hard_skills: explicitly required tools, languages, platforms, concepts. Position = order they appear in the JD (1 = first mentioned).
- soft_skills: preferred, bonus, nice-to-have, or "familiarity with" items.
- Use plain lowercase skill names: "python", "sql", "databricks", "dbt", "airflow", "aws", "azure", "gcp", "tableau", "power bi", "docker", "kubernetes", "terraform", "kafka", "snowflake", "spark", "pyspark", "git", "data modeling", "data quality", "etl", "rag", "llm", "typescript", "r", "scala", "excel", etc.
- For seniority: analyst=data analyst/BI analyst, de-1=junior/associate DE, de-2=mid-level/DE II/plain "Data Engineer", senior=senior DE, staff=staff/principal/lead.
- years_min/years_max: extract from "X+ years" or "X-Y years" requirements. null if not specified.
- salary_min/salary_max: extract dollar amounts. null if not specified.
- remote: true if "remote" or "work from home" is mentioned, false if on-site or hybrid only.
- domain: infer from industry context.
- Include at most 20 hard skills and 10 soft skills. Drop vague non-technical items like "attention to detail".`;

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`Fetching: ${url}`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

// Wait a beat for any lazy-loaded content
await page.waitForTimeout(2000);

// Try to grab the main content area — fall back to full body text
const text = await page.evaluate(() => {
  // Remove nav, footer, header, scripts, styles
  const remove = document.querySelectorAll("nav, footer, header, script, style, [aria-hidden='true']");
  remove.forEach(el => el.remove());

  // Prefer a job-specific container if present
  const selectors = [
    "[data-testid='job-description']",
    ".job-description",
    ".jobDescription",
    "#job-description",
    "main",
    "article",
    ".content",
    "body",
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText.trim().length > 200) return el.innerText.trim();
  }
  return document.body.innerText.trim();
});

await browser.close();

if (!text || text.length < 100) {
  console.error("Could not extract meaningful content from page.");
  process.exit(1);
}

if (DRY_RUN) {
  console.log("\n--- Extracted text ---\n");
  console.log(text.slice(0, 3000));
  process.exit(0);
}

// Use Claude to extract title + company + save the file
const extractPrompt = `${SYSTEM_PROMPT}\n\nURL: ${url}\n\n${text}`;
const jsonRaw = execSync(`claude -p --output-format text`, {
  input: extractPrompt,
  encoding: "utf8",
  maxBuffer: 2 * 1024 * 1024,
}).trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

const data = JSON.parse(jsonRaw);
const filename = toFilename(data.company, data.title);
const filepath = path.join(JDS_DIR, filename);

// Save markdown file
const md = `# ${data.title} at ${data.company}\n\n**URL:** ${url}\n\n${text}`;
fs.writeFileSync(filepath, md, "utf8");
console.log(`Saved: jds/${filename}`);

// Ingest into DB
execSync(`node ingest-jds-folder.mjs`, {
  cwd: __dirname,
  stdio: "inherit",
});
