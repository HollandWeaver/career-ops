# Career-Ops: Architectural System Design & Specification

**Version:** 1.0.0  
**Author:** Holland Weaver  
**Status:** Engineering-Grade Specification  
**Classification:** Public Technical Documentation

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Architectural Philosophy](#2-architectural-philosophy)
3. [System Orchestration](#3-system-orchestration)
    - [The Mode Pattern](#the-mode-pattern)
    - [The Data Contract](#the-data-contract)
4. [Functional Layers](#4-functional-layers)
    - [Ingestion & Verification (Playwright)](#ingestion--verification)
    - [Heuristic Evaluation & Scoring](#heuristic-evaluation--scoring)
    - [Tailored Asset Generation](#tailored-asset-generation)
5. [Data Governance & Security](#5-data-governance--security)
    - [The "Air-Gapped" Personal Layer](#the-air-gapped-personal-layer)
    - [Secret Management](#secret-management)
6. [Operational Workflows](#6-operational-workflows)
    - [Batch Processing & Parallelism](#batch-processing--parallelism)
    - [Normalization & Integrity](#normalization--integrity)
7. [Technical Stack](#7-technical-stack)
8. [Roadmap & Scalability](#8-roadmap--scalability)

---

## 1. Executive Summary
Career-Ops is an AI-native automation framework designed to transform the job search from a manual, high-variance task into a deterministic, engineered pipeline. Unlike generic AI wrappers, it implements a strict separation between **System Logic** (instructions and scripts) and **User Data** (CVs, trackers, and identity). This allows for a "Local-First" security model while leveraging state-of-the-art LLMs for complex heuristic analysis.

## 2. Architectural Philosophy
The system is built on three core principles:
- **Instruction-Driven Logic:** System behavior is defined in Markdown "modes," making the core logic portable across any LLM (Claude, Gemini, GPT-4).
- **Canonical Source of Truth:** `cv.md` and `data/applications.md` serve as the immutable sources of truth, preventing the "hallucination drift" common in LLM-managed databases.
- **Data Sovereignty:** Personal data is never commingled with system code, facilitating safe open-source collaboration and updates.

## 3. System Orchestration

### The Mode Pattern
The system uses a unique "Mode Pattern" where complex tasks are decomposed into Markdown-based instruction sets (`modes/*.md`). 
- **Atomic Responsibility:** Each mode (e.g., `oferta.md` for evaluation, `pdf.md` for CV generation) contains specific scoring heuristics, formatting rules, and tool-use guidelines.
- **Portability:** Because logic is defined in human/AI-readable Markdown, the system can be ported to different LLM providers by simply feeding the mode file as a system prompt.

### The Data Contract
The `DATA_CONTRACT.md` is the architectural anchor. It defines two distinct layers:
- **User Layer:** Files containing PII (Personally Identifiable Information), metrics, and history. These are strictly ignored by Git and the system's auto-update mechanism.
- **System Layer:** Stateless scripts, templates, and modes. These are version-controlled and safely updatable.

## 4. Functional Layers

### Ingestion & Verification
The system employs **Playwright** for deep-web JD extraction. Unlike standard scrapers, it performs "Liveness Verification"—detecting if an application portal is actually active by identifying navigation elements rather than just page status codes.

### Heuristic Evaluation & Scoring
Evaluations follow a standardized 6-block (A-F) heuristic:
1. **Gap Analysis:** Comparing `cv.md` against JD requirements to identify missing skills.
2. **Mitigation Strategy:** Drafting narrative pivots for identified gaps.
3. **STAR+R Generation:** Mapping existing experience to the specific role's challenges.
4. **Scoring:** A weighted 10-dimension metric (1-5 scale) resulting in a final letter grade (A-F).

### Tailored Asset Generation
The system uses a "Schema-First" approach to resume generation.
- **JSON Schema:** Intermediate representation of the tailored CV.
- **Tailored PDF:** Uses a headless Chromium instance to render high-fidelity, ATS-optimized HTML/CSS templates to PDF.

## 5. Data Governance & Security

### The "Air-Gapped" Personal Layer
The architectural design enforces a "soft air-gap." All personal data resides in the `User Layer`. 
- **Zero Leakage:** The `.gitignore` is hardened to prevent accidental commits of `cv.md`, `article-digest.md`, or the `data/` directory.
- **Local SQLite:** `skill-map.db` stores market intelligence locally, ensuring that competitive intelligence stays on the user's machine.

### Secret Management
- **Environment Isolation:** API keys are stored in a local `.env` file, never committed.
- **Stateless Logic:** System modes never store state; they ingest local data at runtime and output to local directories.

## 6. Operational Workflows

### Batch Processing & Parallelism
The system supports massive-scale evaluation via `batch/batch-runner.sh`.
- **Parallel Workers:** Spawns multiple headless LLM instances (e.g., `claude -p`).
- **State Management:** Uses `batch-state.tsv` to track progress, allowing for resumes and retries without data loss.

### Normalization & Integrity
A suite of utility scripts (`*.mjs`) maintains pipeline integrity:
- `merge-tracker.mjs`: Prevents race conditions during batch updates to the master tracker.
- `verify-pipeline.mjs`: Ensures all links between reports, PDFs, and tracker entries are valid.

## 7. Technical Stack
- **Runtime:** Node.js (ESM)
- **Engine:** Playwright (Chromium)
- **Database:** SQLite (Better-SQLite3) for skill mapping
- **Logic:** Markdown-based Prompt Engineering (System Modes)
- **Formatting:** YAML (Configuration), HTML/CSS (Templates)
- **Visualization:** Go (TUI Dashboard)

## 8. Roadmap & Scalability
- **LLM Agnostic API:** Transitioning from vendor-specific CLI calls to a unified API bridge.
- **Vector Embeddings:** Local RAG (Retrieval-Augmented Generation) for more precise `STAR+R` story matching from the `story-bank.md`.
- **Global Orchestration:** Support for multi-language evaluation (DE, FR, JA) out of the box.
