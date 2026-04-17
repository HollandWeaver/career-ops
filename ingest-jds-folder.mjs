/**
 * ingest-jds-folder.mjs
 *
 * Reads all .md files in jds/, extracts structured skill data using
 * Claude, and ingests each into data/skill-map.db via jd-ingest logic.
 *
 * Usage:
 *   node ingest-jds-folder.mjs              → process all unprocessed .md files in jds/
 *   node ingest-jds-folder.mjs --all        → reprocess all files (ignore already-ingested)
 *   node ingest-jds-folder.mjs --dry-run    → print extracted JSON without writing to DB
 *
 * File naming convention: Company_Job_Title.md
 * Spaces, hyphens, and " - " all normalize to single underscores.
 */

import { execSync } from "child_process";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JDS_DIR   = path.join(__dirname, "jds");
const DB_PATH   = path.join(__dirname, "data", "skill-map.db");
const LOG_PATH  = path.join(__dirname, "data", "ingest-log.json");

const args = process.argv.slice(2);
const DRY_RUN  = args.includes("--dry-run");
const REPROCESS = args.includes("--all");

// ── Seniority inference from title ───────────────────────────────────────────

function inferSeniority(title) {
  const t = title.toLowerCase();
  if (/staff|principal/.test(t))                        return "staff";
  if (/senior|sr\.?\s/.test(t))                         return "senior";
  if (/\bii\b|mid.?level|engineer ii|analyst ii/.test(t)) return "de-2";
  if (/\bi\b|junior|jr\.?|associate|entry/.test(t))     return "de-1";
  if (/analyst|bi |business intelligence/.test(t))      return "analyst";
  if (/lead|principal/.test(t))                         return "senior";
  return "de-2"; // default: assume mid-level
}

function inferDomain(text) {
  const t = text.toLowerCase();
  if (/health|clinical|ehr|fhir|hl7|hipaa|medical|pharma|patient/.test(t)) return "healthcare";
  if (/fintech|finance|banking|loan|mortgage|payment|credit|insurance/.test(t)) return "fintech";
  if (/government|federal|dod|clearance|public sector|gov/.test(t)) return "govtech";
  if (/marketing|ad tech|advertising|campaign|media/.test(t)) return "adtech";
  if (/education|edtech|university|school|learning/.test(t)) return "edtech";
  return "general";
}

// ── Claude extraction via Claude Code CLI ─────────────────────────────────────

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
  "url": null,
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

async function extractFromJD(filename, content) {
  const prompt = `${SYSTEM_PROMPT}\n\nFilename: ${filename}\n\n${content}`;
  const result = execSync(`claude -p --output-format text`, {
    input: prompt,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  const text = result.trim();
  // Strip markdown code fences if Claude wraps the JSON
  const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(cleaned);
}

// ── Ingest logic (mirrors jd-ingest.mjs) ─────────────────────────────────────

const ALIASES = {
  "python": "python", "python scripting": "python", "python programming": "python",
  "pyspark": "pyspark", "apache spark": "pyspark", "spark": "pyspark", "sparksql": "pyspark",
  "sql": "sql", "t-sql": "t-sql", "tsql": "t-sql", "transact-sql": "t-sql",
  "sql server": "sql-server", "microsoft sql server": "sql-server",
  "azure sql": "azure-sql", "azure sql managed instance": "azure-sql",
  "mysql": "mysql", "postgresql": "postgresql", "postgres": "postgresql",
  "databricks": "databricks", "azure databricks": "databricks", "dbx": "databricks",
  "dbt": "dbt", "dbt core": "dbt", "dbt cloud": "dbt",
  "airflow": "airflow", "apache airflow": "airflow", "cloud composer": "airflow",
  "azure data factory": "azure-data-factory", "adf": "azure-data-factory",
  "aws": "aws", "amazon web services": "aws",
  "azure": "azure", "microsoft azure": "azure",
  "gcp": "gcp", "google cloud": "gcp", "google cloud platform": "gcp",
  "s3": "aws-s3", "aws s3": "aws-s3", "redshift": "redshift", "amazon redshift": "redshift",
  "glue": "aws-glue", "aws glue": "aws-glue", "lambda": "aws-lambda",
  "bigquery": "bigquery", "snowflake": "snowflake",
  "azure synapse": "azure-synapse", "synapse": "azure-synapse",
  "terraform": "terraform", "bicep": "terraform", "iac": "terraform",
  "docker": "docker", "containerization": "docker",
  "kubernetes": "kubernetes", "k8s": "kubernetes",
  "ci/cd": "ci-cd", "github actions": "ci-cd", "jenkins": "ci-cd", "gitlab ci": "ci-cd",
  "azure devops": "azure-devops",
  "delta lake": "delta-lake", "delta": "delta-lake",
  "parquet": "parquet", "kafka": "kafka", "apache kafka": "kafka",
  "tableau": "tableau", "power bi": "power-bi", "powerbi": "power-bi",
  "looker": "looker", "metabase": "metabase",
  "git": "git", "github": "git", "version control": "git",
  "rag": "rag", "llm": "llm", "llm api": "llm-api",
  "langchain": "langchain", "mlflow": "mlflow", "mlops": "mlops",
  "vector database": "vector-db", "pinecone": "vector-db",
  "etl": "etl", "elt": "etl", "etl/elt": "etl",
  "informatica": "informatica", "fivetran": "fivetran", "airbyte": "airbyte",
  "data modeling": "data-modeling", "data warehouse": "data-warehouse",
  "data governance": "data-governance", "data lineage": "data-lineage",
  "data quality": "data-quality", "data validation": "data-quality",
  "fhir": "healthcare-data-standards", "hl7": "healthcare-data-standards",
  "scala": "scala", "java": "java", "typescript": "typescript",
  "javascript": "javascript", "r": "r", "powershell": "powershell",
  "excel": "excel", "vba": "vba",
  "communication": "communication", "collaboration": "collaboration",
  "agile": "agile", "scrum": "agile",
  "api": "api-integration", "rest api": "api-integration", "api integration": "api-integration",
};

const CATEGORIES = {
  python: "language", pyspark: "platform", sql: "language", "t-sql": "language",
  "sql-server": "platform", "azure-sql": "platform", mysql: "platform",
  postgresql: "platform", databricks: "platform", dbt: "tool",
  airflow: "tool", "azure-data-factory": "tool",
  aws: "cloud", azure: "cloud", gcp: "cloud",
  "aws-s3": "cloud", redshift: "platform", "aws-glue": "cloud",
  "aws-lambda": "cloud", bigquery: "platform", snowflake: "platform",
  "azure-synapse": "platform", terraform: "tool", docker: "tool",
  kubernetes: "tool", "ci-cd": "tool", "azure-devops": "tool",
  "delta-lake": "concept", parquet: "concept",
  kafka: "tool", tableau: "tool", "power-bi": "tool", looker: "tool",
  git: "tool", rag: "concept", llm: "concept", "llm-api": "platform",
  langchain: "framework", mlflow: "tool", mlops: "concept",
  "vector-db": "platform", etl: "concept", informatica: "tool",
  fivetran: "tool", airbyte: "tool",
  "data-modeling": "concept", "data-warehouse": "concept",
  "data-governance": "concept", "data-lineage": "concept",
  "data-quality": "concept", "data-mesh": "concept",
  "healthcare-data-standards": "concept",
  scala: "language", java: "language", typescript: "language",
  javascript: "language", r: "language", powershell: "language",
  excel: "tool", vba: "tool",
  communication: "soft", collaboration: "soft", agile: "soft",
  "api-integration": "concept",
};

function normalize(rawName) {
  const lower = rawName.toLowerCase().trim();
  return ALIASES[lower] || lower.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
}

function categoryFor(c) { return CATEGORIES[c] || "tool"; }

function openDB() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_postings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, report_num INTEGER, title TEXT,
      company TEXT, seniority TEXT, years_min INTEGER, years_max INTEGER,
      salary_min INTEGER, salary_max INTEGER, remote INTEGER, domain TEXT,
      url TEXT, match_score REAL, date_added TEXT
    );
    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT, canonical_name TEXT UNIQUE, category TEXT
    );
    CREATE TABLE IF NOT EXISTS job_skills (
      job_id INTEGER REFERENCES job_postings(id), skill_id INTEGER REFERENCES skills(id),
      requirement_type TEXT, list_position INTEGER, PRIMARY KEY (job_id, skill_id)
    );
  `);
  return db;
}

function ingestOne(db, data) {
  const { title, company, seniority, years_min, years_max, salary_min, salary_max,
          remote, domain, url, match_score, report_num, hard_skills = [], soft_skills = [] } = data;
  const res = db.prepare(`
    INSERT INTO job_postings (report_num, title, company, seniority, years_min, years_max,
      salary_min, salary_max, remote, domain, url, match_score, date_added)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))
  `).run(report_num ?? null, title, company, seniority, years_min ?? null, years_max ?? null,
         salary_min ?? null, salary_max ?? null, remote ? 1 : 0, domain ?? "general",
         url ?? null, match_score ?? null);
  const jobId = res.lastInsertRowid;
  const upsert = db.prepare(`INSERT INTO skills (canonical_name, category) VALUES (?, ?) ON CONFLICT(canonical_name) DO NOTHING`);
  const getId  = db.prepare(`SELECT id FROM skills WHERE canonical_name = ?`);
  const ins    = db.prepare(`INSERT OR IGNORE INTO job_skills (job_id, skill_id, requirement_type, list_position) VALUES (?, ?, ?, ?)`);
  for (const { name, position, type } of [...hard_skills.map(s => ({...s, type:"hard"})), ...soft_skills.map(s => ({...s, type:"soft"}))]) {
    const c = normalize(name);
    upsert.run(c, categoryFor(c));
    ins.run(jobId, getId.get(c).id, type, position ?? 99);
  }
  return jobId;
}

// ── Main ──────────────────────────────────────────────────────────────────────

// Load ingest log (tracks which files have been processed)
let log = {};
if (fs.existsSync(LOG_PATH)) {
  try { log = JSON.parse(fs.readFileSync(LOG_PATH, "utf8")); } catch {}
}

const files = fs.readdirSync(JDS_DIR)
  .filter(f => f.endsWith(".md"))
  .filter(f => REPROCESS || !log[f]);

if (files.length === 0) {
  console.log("No new JD files to process. Use --all to reprocess existing files.");
  process.exit(0);
}

console.log(`Processing ${files.length} file(s)...\n`);

const db = DRY_RUN ? null : openDB();
const ingest = DRY_RUN ? null : db.transaction((d) => ingestOne(db, d));

let success = 0, failed = 0;

for (const file of files) {
  const content = fs.readFileSync(path.join(JDS_DIR, file), "utf8");
  process.stdout.write(`  ${file} → extracting... `);

  try {
    const data = await extractFromJD(file, content);

    if (DRY_RUN) {
      console.log("\n" + JSON.stringify(data, null, 2));
    } else {
      const id = ingest(data);
      log[file] = { ingested_at: new Date().toISOString(), job_id: Number(id), title: data.title, company: data.company };
      console.log(`✓ ${data.company} — ${data.title} (id=${id})`);
    }
    success++;
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}`);
    failed++;
  }
}

if (!DRY_RUN) {
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
  db.close();
}

console.log(`\nDone: ${success} ingested, ${failed} failed.`);
if (!DRY_RUN) console.log(`Log updated: ${LOG_PATH}`);
