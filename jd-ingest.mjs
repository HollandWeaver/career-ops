/**
 * jd-ingest.mjs
 *
 * Ingest a structured JD JSON object into data/skill-map.db.
 * Called after each evaluation to capture skill signal.
 *
 * Usage:
 *   node jd-ingest.mjs '{"title":"Data Engineer II","company":"Nextech",...}'
 *   node jd-ingest.mjs path/to/jd-data.json
 *
 * JSON schema:
 * {
 *   "title":       string,
 *   "company":     string,
 *   "seniority":   "analyst"|"de-1"|"de-2"|"senior"|"staff"|"principal",
 *   "years_min":   number|null,
 *   "years_max":   number|null,
 *   "salary_min":  number|null,
 *   "salary_max":  number|null,
 *   "remote":      boolean,
 *   "domain":      "healthcare"|"fintech"|"adtech"|"general"|"govtech"|"edtech"|...,
 *   "url":         string|null,
 *   "match_score": number|null,
 *   "report_num":  number|null,
 *   "hard_skills": [{"name": string, "position": number}, ...],
 *   "soft_skills": [{"name": string, "position": number}, ...]
 * }
 */

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ── Skill alias map ───────────────────────────────────────────────────────────
// Normalize raw JD skill strings to canonical names.
// Add variants here — keys are lowercase, values are canonical names.

const ALIASES = {
  // Python
  "python": "python", "python scripting": "python", "python programming": "python",
  "python (pyspark, fastapi, pandas)": "python", "python/pyspark": "python",

  // PySpark / Spark
  "pyspark": "pyspark", "apache spark": "pyspark", "spark": "pyspark",
  "sparksql": "pyspark", "spark sql": "pyspark",

  // SQL
  "sql": "sql", "t-sql": "t-sql", "tsql": "t-sql", "transact-sql": "t-sql",
  "sql server": "sql-server", "microsoft sql server": "sql-server",
  "azure sql": "azure-sql", "azure sql managed instance": "azure-sql",
  "window functions": "sql", "ctes": "sql", "stored procedures": "sql",
  "mysql": "mysql", "postgresql": "postgresql", "postgres": "postgresql",

  // Databricks
  "databricks": "databricks", "azure databricks": "databricks", "dbx": "databricks",
  "databricks lakehouse": "databricks", "databricks workflows": "databricks",

  // dbt
  "dbt": "dbt", "dbt core": "dbt", "dbt cloud": "dbt",

  // Airflow
  "airflow": "airflow", "apache airflow": "airflow", "cloud composer": "airflow",
  "azure data factory": "azure-data-factory", "adf": "azure-data-factory",

  // Cloud platforms
  "aws": "aws", "amazon web services": "aws",
  "azure": "azure", "microsoft azure": "azure",
  "gcp": "gcp", "google cloud": "gcp", "google cloud platform": "gcp",

  // Cloud tools
  "s3": "aws-s3", "aws s3": "aws-s3", "amazon s3": "aws-s3",
  "redshift": "redshift", "amazon redshift": "redshift",
  "glue": "aws-glue", "aws glue": "aws-glue",
  "lambda": "aws-lambda", "aws lambda": "aws-lambda",
  "bigquery": "bigquery", "google bigquery": "bigquery",
  "snowflake": "snowflake",
  "azure synapse": "azure-synapse", "synapse": "azure-synapse",

  // Infrastructure
  "terraform": "terraform", "bicep": "terraform", "arm templates": "terraform",
  "infrastructure as code": "terraform", "iac": "terraform",
  "docker": "docker", "containerization": "docker",
  "kubernetes": "kubernetes", "k8s": "kubernetes",
  "ci/cd": "ci-cd", "github actions": "ci-cd", "jenkins": "ci-cd",
  "gitlab ci": "ci-cd", "azure devops": "azure-devops",

  // Storage formats
  "delta lake": "delta-lake", "delta": "delta-lake",
  "parquet": "parquet", "avro": "avro",

  // Streaming
  "kafka": "kafka", "apache kafka": "kafka",
  "azure event hubs": "kafka", "event hubs": "kafka",
  "kinesis": "aws-kinesis", "aws kinesis": "aws-kinesis",

  // BI tools
  "tableau": "tableau", "power bi": "power-bi", "powerbi": "power-bi",
  "looker": "looker", "metabase": "metabase", "sisense": "sisense",
  "sigma": "sigma",

  // Git
  "git": "git", "github": "git", "version control": "git", "gitlab": "git",

  // AI/ML
  "rag": "rag", "retrieval-augmented generation": "rag",
  "llm": "llm", "large language model": "llm",
  "llm api": "llm-api", "openai api": "llm-api", "anthropic api": "llm-api",
  "langchain": "langchain",
  "mlflow": "mlflow", "mlops": "mlops",
  "vector database": "vector-db", "pinecone": "vector-db", "pgvector": "vector-db",

  // ETL/ELT
  "etl": "etl", "elt": "etl", "etl/elt": "etl",
  "informatica": "informatica",
  "fivetran": "fivetran", "airbyte": "airbyte", "stitch": "stitch",

  // Data concepts
  "data modeling": "data-modeling", "data warehouse": "data-warehouse",
  "data governance": "data-governance", "data lineage": "data-lineage",
  "data quality": "data-quality", "data validation": "data-quality",
  "data mesh": "data-mesh", "data lakehouse": "databricks",
  "fhir": "healthcare-data-standards", "hl7": "healthcare-data-standards",

  // Languages
  "scala": "scala", "java": "java", "typescript": "typescript",
  "javascript": "javascript", "r": "r", "powershell": "powershell",
  "bash": "bash", "shell scripting": "bash",

  // Soft
  "communication": "communication", "cross-functional collaboration": "collaboration",
  "stakeholder management": "collaboration", "agile": "agile", "scrum": "agile",
};

// Skill category map
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
  "delta-lake": "concept", parquet: "concept", avro: "concept",
  kafka: "tool", "aws-kinesis": "tool",
  tableau: "tool", "power-bi": "tool", looker: "tool",
  metabase: "tool", sisense: "tool", sigma: "tool",
  git: "tool", rag: "concept", llm: "concept", "llm-api": "platform",
  langchain: "framework", mlflow: "tool", mlops: "concept",
  "vector-db": "platform", etl: "concept", informatica: "tool",
  fivetran: "tool", airbyte: "tool", stitch: "tool",
  "data-modeling": "concept", "data-warehouse": "concept",
  "data-governance": "concept", "data-lineage": "concept",
  "data-quality": "concept", "data-mesh": "concept",
  "healthcare-data-standards": "concept",
  scala: "language", java: "language", typescript: "language",
  javascript: "language", r: "language", powershell: "language",
  bash: "language", communication: "soft", collaboration: "soft", agile: "soft",
};

function normalize(rawName) {
  const lower = rawName.toLowerCase().trim();
  return ALIASES[lower] || lower.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
}

function categoryFor(canonical) {
  return CATEGORIES[canonical] || "tool";
}

// ── DB setup ──────────────────────────────────────────────────────────────────

const DB_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "data", "skill-map.db");

function openDB() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_postings (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      report_num  INTEGER,
      title       TEXT,
      company     TEXT,
      seniority   TEXT,
      years_min   INTEGER,
      years_max   INTEGER,
      salary_min  INTEGER,
      salary_max  INTEGER,
      remote      INTEGER,
      domain      TEXT,
      url         TEXT,
      match_score REAL,
      date_added  TEXT
    );

    CREATE TABLE IF NOT EXISTS skills (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      canonical_name TEXT UNIQUE,
      category       TEXT
    );

    CREATE TABLE IF NOT EXISTS job_skills (
      job_id           INTEGER REFERENCES job_postings(id),
      skill_id         INTEGER REFERENCES skills(id),
      requirement_type TEXT,
      list_position    INTEGER,
      PRIMARY KEY (job_id, skill_id)
    );
  `);
  return db;
}

// ── Ingestion ─────────────────────────────────────────────────────────────────

function ingestJD(db, data) {
  const {
    title, company, seniority, years_min, years_max,
    salary_min, salary_max, remote, domain, url,
    match_score, report_num,
    hard_skills = [], soft_skills = [],
  } = data;

  // Insert job posting
  const insertJob = db.prepare(`
    INSERT INTO job_postings
      (report_num, title, company, seniority, years_min, years_max,
       salary_min, salary_max, remote, domain, url, match_score, date_added)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))
  `);
  const jobResult = insertJob.run(
    report_num ?? null, title, company, seniority,
    years_min ?? null, years_max ?? null,
    salary_min ?? null, salary_max ?? null,
    remote ? 1 : 0, domain ?? "general",
    url ?? null, match_score ?? null,
  );
  const jobId = jobResult.lastInsertRowid;

  const upsertSkill = db.prepare(`
    INSERT INTO skills (canonical_name, category)
    VALUES (?, ?)
    ON CONFLICT(canonical_name) DO NOTHING
  `);
  const getSkillId = db.prepare(`SELECT id FROM skills WHERE canonical_name = ?`);
  const insertJobSkill = db.prepare(`
    INSERT OR IGNORE INTO job_skills (job_id, skill_id, requirement_type, list_position)
    VALUES (?, ?, ?, ?)
  `);

  const addSkills = (skills, type) => {
    for (const { name, position } of skills) {
      const canonical = normalize(name);
      const category = categoryFor(canonical);
      upsertSkill.run(canonical, category);
      const skillRow = getSkillId.get(canonical);
      insertJobSkill.run(jobId, skillRow.id, type, position ?? 99);
    }
  };

  addSkills(hard_skills, "hard");
  addSkills(soft_skills, "soft");

  return jobId;
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const [,, input] = process.argv;
if (!input) {
  console.error("Usage: node jd-ingest.mjs '<json>' | path/to/file.json");
  process.exit(1);
}

let data;
try {
  // Try as file path first
  if (fs.existsSync(input)) {
    data = JSON.parse(fs.readFileSync(input, "utf8"));
  } else {
    data = JSON.parse(input);
  }
} catch (e) {
  console.error("Failed to parse input as JSON:", e.message);
  process.exit(1);
}

const db = openDB();
const ingest = db.transaction((d) => ingestJD(db, d));

if (Array.isArray(data)) {
  let count = 0;
  for (const item of data) {
    ingest(item);
    count++;
  }
  console.log(`✓ Ingested ${count} job postings into ${DB_PATH}`);
} else {
  const id = ingest(data);
  console.log(`✓ Ingested "${data.company} — ${data.title}" (id=${id}) into ${DB_PATH}`);
}

db.close();
