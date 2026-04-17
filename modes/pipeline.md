# Mode: pipeline — URL Inbox

Processes offer URLs accumulated in `data/pipeline.md`. The user adds URLs whenever they want, then runs `/career-ops pipeline` to process them all.

## Workflow

1. **Read** `data/pipeline.md` → find `- [ ]` items in the "Pending" section
2. **For each pending URL**:
   a. Calculate the next sequential `REPORT_NUM` (read `reports/`, take highest number + 1)
   b. **Extract JD** using Playwright (`browser_navigate` + `browser_snapshot`) → WebFetch → WebSearch
   c. If URL is not accessible → mark as `- [!]` with a note and continue
   d. **Run full auto-pipeline**: Evaluation → Report .md → PDF (if match ≥ 80%) → Tracker
   e. **Move from Pending to Processed**: `- [x] #NNN | URL | Company | Role | XX% (TN) | PDF ✅/❌`
3. **If 3+ URLs are pending**, launch parallel agents (`Agent` tool with `run_in_background`) to maximize speed.
4. **When done**, display a summary table:

```
| # | Company | Role | Match | Bucket | PDF | Action |
```

## pipeline.md format

```markdown
## Pending
- [ ] https://jobs.example.com/posting/123
- [ ] https://boards.greenhouse.io/company/jobs/456 | Company Inc | Senior PM
- [!] https://private.url/job — Error: login required

## Processed
- [x] #143 | https://jobs.example.com/posting/789 | Acme Corp | AI PM | 94% (T2) | PDF ✅
- [x] #144 | https://boards.greenhouse.io/xyz/jobs/012 | BigCo | Data Engineer | 72% (SKIP) | PDF ❌
```

## JD Extraction Strategy

1. **Playwright (preferred):** `browser_navigate` + `browser_snapshot`. Works with all SPAs.
2. **WebFetch (fallback):** For static pages or when Playwright is unavailable.
3. **WebSearch (last resort):** Search secondary portals that index the JD.

**Special cases:**
- **LinkedIn**: May require login → mark `[!]` and ask user to paste the text
- **PDF**: If URL points to a PDF, read it directly with the Read tool
- **`local:` prefix**: Read the local file. Example: `local:jds/company-role.md` → read `jds/company-role.md`

## Sequential Numbering

1. List all files in `reports/`
2. Extract the prefix number (e.g., `142-company-role...` → 142)
3. New number = highest found + 1

## Source Sync Check

Before processing any URL, verify sync:
```bash
node cv-sync-check.mjs
```
If there are warnings, notify the user before continuing.
