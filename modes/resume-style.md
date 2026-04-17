# Resume Style Guide — Holland Weaver

## Architecture

The formatting is split from the content:

1. **LLM generates JSON** — content only, following the schema in `resume-schema.json`
2. **`build_resume.mjs` builds the DOCX** — all formatting is hardcoded in the script
3. **Typst compiles the PDF** — use `output/temp-resume.typ` pattern (mirrors JSON content)

```bash
# DOCX
node build_resume.mjs output/resume-yahoo.json "output/Holland Weaver resume Yahoo Data Engineer.docx"

# PDF (Typst)
typst compile output/temp-resume.typ "output/Holland Weaver resume Yahoo Data Engineer.pdf"
```

The LLM **never touches formatting**. It only writes content into the JSON schema.

---

## Formatting Specs (extracted from FanDuel DOCX XML)

| Element | Spec |
|---------|------|
| Page | 8.5" × 11" |
| Margins | L/R: 0.5625", Top: 0.3125", Bottom: 0.11" |
| Body font | Calibri, 10pt (inherited) |
| Name "Holland" | 26pt bold, centered |
| Name "Weaver" | 22pt bold, centered (same line) |
| Contact line | Centered, regular, `·` separators |
| Section headers | ALL CAPS bold, bottom border #1F5C99 0.5pt, space_before=7pt, space_after=3pt |
| Company lines | Right tab at 7.75" (11160 twips), company bold, date bold #404040 |
| Company line secondary | Role + ` \| ` + Location rendered as one italic run: **Company** \| *Role \| Location* → **Date** |
| Bullets | Left indent 0.125" hanging 0.125", bullet char `•` |
| Bullet lead phrase | **Bold**, wraps into regular text |
| Skills | Plain paragraph, `**Category:** items` |

---

## JSON Schema

```json
{
  "header": {
    "first_name": "Holland",
    "last_name": "Weaver",
    "email": "weaver.holland@gmail.com",
    "phone": "(321) 544-0100",
    "location": "Titusville, FL",
    "linkedin": "linkedin.com/in/hollandweaver"
  },
  "summary": "Text with **inline bold** using double asterisks.",
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "location": "City, ST",
      "dates": "Month YYYY – Month YYYY",
      "bullets": [
        "**Bold lead phrase** then regular continuation text.",
        "**Another bold lead** rest of bullet."
      ]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "role": "Your Role",
      "context": "Independent Project",
      "dates": "Month YYYY – Present",
      "bullets": ["**Bold lead** rest of text."]
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "B.S. Degree (Track)",
      "gpa": "GPA 3.4",
      "dates": "Graduated Month YYYY",
      "bullets": ["**Bold lead:** rest of text."]
    }
  ],
  "skills": [
    { "category": "Category Name:", "items": "item1, item2, item3" }
  ]
}
```

### Bullet formatting rule

Wrap the bold lead phrase in `**...**`:

```
"**Owned 40% of the team's test volume** for a governance system processing 12M+ rows..."
```

The builder splits on `**...**` and applies Word bold to the lead, regular to the rest. If no `**` markers are present, the builder splits on the first comma/colon automatically.

### Summary inline bold

Same `**...**` convention applies in the summary string.

**Rules for what to bold in the summary:**
1. **Years of experience** — always bold the figure: `**2 years**`, `**3 years**`
2. **Primary bait tools** — bold the 1–2 tools that are the #1 keyword match for the specific JD (e.g., `**Python**` and `**Databricks**` for a data analytics role, `**SQL**` for a data engineering role). These go in sentence 1 or 2, where the hiring manager's eye lands first.
3. **Key metrics** — already the convention: `**$15M**`, `**12M+ rows**`, etc.

---

## Section Order

| # | Section | JSON key |
|---|---------|----------|
| 1 | Name | `header.first_name` + `header.last_name` |
| 2 | Contact | `header.email`, `phone`, `location`, `linkedin` |
| 3 | SUMMARY | `summary` |
| 4 | PROFESSIONAL EXPERIENCE | `experience[]` |
| 5 | PROJECTS | `projects[]` |
| 6 | EDUCATION | `education[]` |
| 7 | TECHNICAL SKILLS | `skills[]` |

---

## Personalization Per JD

When generating a tailored resume, the LLM:

1. Reads `cv.md` and `article-digest.md` for proof points
2. Selects/rewrites bullets to match the JD keywords
3. Outputs a JSON file to `output/resume-{company-slug}.json`
4. The system runs `build_resume.mjs` to produce the DOCX
5. Typst compiles the PDF separately

The script (`build_resume.mjs`) never changes between resumes. Only the JSON changes.

---

## Key Metrics (never fabricate new ones)

| Metric | Context |
|--------|---------|
| 12M+ rows, 250+ columns | Deloitte data governance system |
| 40% of team's test volume | Deloitte — test ownership |
| 52 professional textbooks | LLM STEM Tutor ETL scope |
| 3 years | Total professional experience |
| GPA 3.4 | UCF B.S. Economics |
| $15M+ sales pipeline | ADP SQL validation scope |
| 20% reduction in manual validation | ADP QA automation |
| 5-test QA pipeline, A–F grading | LLM STEM Tutor quality system |
| 60+ stakeholders | ADP reporting distribution |

---

## Never Include

- Lockheed Martin (2018–2019 internship — adds noise for AI/data roles)
- "References available upon request"
- Core Competencies grid
- Inline HTML or images
- Horizontal rules (`---`) as section dividers — the script handles borders
