# Modo: pdf — Resume Generation (PDF + DOCX)

## Style Guide

**ALWAYS read `modes/resume-style.md` before generating any resume.** It defines:
- The canonical formatting rules (prose bullets, no bold labels, ALL CAPS headers)
- The reference-doc path for DOCX generation
- Key metrics that must appear (12M+ rows, 40% test volume, 52 textbooks, GPA 3.4)
- Hard rules about what to include/exclude (no Lockheed for AI roles, no Core Competencies grid)

## Pipeline completo

1. Lee `modes/resume-style.md` para reglas de formato
2. Lee `cv.md` como fuente de verdad de contenido
3. Pide al usuario el JD si no está en contexto (texto o URL)
4. Extrae 15-20 keywords del JD
5. Detecta idioma del JD → idioma del CV (EN default)
6. Detecta ubicación empresa → formato papel:
   - US/Canada → `letter`
   - Resto del mundo → `a4`
7. Detecta arquetipo del rol → adapta framing
8. Reescribe Professional Summary inyectando keywords del JD
9. Selecciona top 3-4 proyectos más relevantes para la oferta
10. Reordena bullets de experiencia por relevancia al JD — aplica reglas de `resume-style.md` (prose bullets, verbs fuertes, no bold labels)
11. Inyecta keywords naturalmente en logros existentes (NUNCA inventa)
12. Genera markdown siguiendo la estructura exacta de `resume-style.md` (H1 nombre, H2 sections, H3 company lines con tab, bullets prose)
13. Escribe el markdown a `output/temp-resume.md`
14. **Genera DOCX** (editable, para el candidato):
    ```bash
    pandoc output/temp-resume.md \
      --reference-doc="C:/Users/Holland Weaver/iCloudDrive/Documents/Professional/Resumes/Holland Weaver resume Analytics Engineer FanDuel.docx" \
      -o "output/Holland Weaver resume {Company} {Role}.docx"
    ```
15. **Genera PDF** (ATS, para upload):
    - Convierte el markdown a Typst basándose en `resume.typ`
    - Escribe a `output/temp-resume.typ`
    - Ejecuta: `typst compile "output/temp-resume.typ" "output/Holland Weaver resume {Company} {Role}.pdf"`
    - Ejecuta: `rm output/temp-resume.typ`
16. Ejecuta: `rm output/temp-resume.md` para limpiar archivos temporales.
17. Reporta: rutas del DOCX y PDF, % cobertura de keywords

## Reglas ATS (parseo limpio)

- Layout single-column (sin sidebars, sin columnas paralelas)
- Headers estándar: "Professional Summary", "Work Experience", "Education", "Skills", "Certifications", "Projects"
- Sin texto en imágenes/SVGs
- Sin info crítica en headers/footers del PDF (ATS los ignora)
- UTF-8, texto seleccionable (no rasterizado)
- Sin tablas anidadas
- Keywords del JD distribuidas: Summary (top 5), primer bullet de cada rol, Skills section

## Diseño del PDF

- **Fonts**: Space Grotesk (headings, 600-700) + DM Sans (body, 400-500)
- **Fonts self-hosted**: `fonts/`
- **Header**: nombre en Space Grotesk 24px bold + línea gradiente `linear-gradient(to right, hsl(187,74%,32%), hsl(270,70%,45%))` 2px + fila de contacto
- **Section headers**: Space Grotesk 13px, uppercase, letter-spacing 0.05em, color cyan primary
- **Body**: DM Sans 11px, line-height 1.5
- **Company names**: color accent purple `hsl(270,70%,45%)`
- **Márgenes**: 0.6in
- **Background**: blanco puro

## Orden de secciones (optimizado "6-second recruiter scan")

1. Header (nombre grande, gradiente, contacto, link portfolio)
2. Professional Summary (3-4 líneas, keyword-dense)
3. Core Competencies (6-8 keyword phrases en flex-grid)
4. Work Experience (cronológico inverso)
5. Projects (top 3-4 más relevantes)
6. Education & Certifications
7. Skills (idiomas + técnicos)

## Estrategia de keyword injection (ético, basado en verdad)

Ejemplos de reformulación legítima:
- JD dice "RAG pipelines" y CV dice "LLM workflows with retrieval" → cambiar a "RAG pipeline design and LLM orchestration workflows"
- JD dice "MLOps" y CV dice "observability, evals, error handling" → cambiar a "MLOps and observability: evals, error handling, cost monitoring"
- JD dice "stakeholder management" y CV dice "collaborated with team" → cambiar a "stakeholder management across engineering, operations, and business"

**NUNCA añadir skills que el candidato no tiene. Solo reformular experiencia real con el vocabulario exacto del JD.**

## Template HTML

Usar el template en `cv-template.html`. Reemplazar los placeholders `{{...}}` con contenido personalizado:

| Placeholder | Contenido |
|-------------|-----------|
| `{{LANG}}` | `en` o `es` |
| `{{PAGE_WIDTH}}` | `8.5in` (letter) o `210mm` (A4) |
| `{{NAME}}` | (from profile.yml) |
| `{{EMAIL}}` | (from profile.yml) |
| `{{LINKEDIN_URL}}` | [from profile.yml] |
| `{{LINKEDIN_DISPLAY}}` | [from profile.yml] |
| `{{PORTFOLIO_URL}}` | [from profile.yml] (o /es según idioma) |
| `{{PORTFOLIO_DISPLAY}}` | [from profile.yml] (o /es según idioma) |
| `{{LOCATION}}` | [from profile.yml] |
| `{{SECTION_SUMMARY}}` | Professional Summary / Resumen Profesional |
| `{{SUMMARY_TEXT}}` | Summary personalizado con keywords |
| `{{SECTION_COMPETENCIES}}` | Core Competencies / Competencias Core |
| `{{COMPETENCIES}}` | `<span class="competency-tag">keyword</span>` × 6-8 |
| `{{SECTION_EXPERIENCE}}` | Work Experience / Experiencia Laboral |
| `{{EXPERIENCE}}` | HTML de cada trabajo con bullets reordenados |
| `{{SECTION_PROJECTS}}` | Projects / Proyectos |
| `{{PROJECTS}}` | HTML de top 3-4 proyectos |
| `{{SECTION_EDUCATION}}` | Education / Formación |
| `{{EDUCATION}}` | HTML de educación |
| `{{SECTION_CERTIFICATIONS}}` | Certifications / Certificaciones |
| `{{CERTIFICATIONS}}` | HTML de certificaciones |
| `{{SECTION_SKILLS}}` | Skills / Competencias |
| `{{SKILLS}}` | HTML de skills |

## Canva CV Generation (optional)

If `config/profile.yml` has `canva_resume_design_id` set, offer the user a choice before generating:
- **"HTML/PDF (fast, ATS-optimized)"** — existing flow above
- **"Canva CV (visual, design-preserving)"** — new flow below

If the user has no `canva_resume_design_id`, skip this prompt and use the HTML/PDF flow.

### Canva workflow

#### Step 1 — Duplicate the base design

a. `export-design` the base design (using `canva_resume_design_id`) as PDF → get download URL
b. `import-design-from-url` using that download URL → creates a new editable design (the duplicate)
c. Note the new `design_id` for the duplicate

#### Step 2 — Read the design structure

a. `get-design-content` on the new design → returns all text elements (richtexts) with their content
b. Map text elements to CV sections by content matching:
   - Look for the candidate's name → header section
   - Look for "Summary" or "Professional Summary" → summary section
   - Look for company names from cv.md → experience sections
   - Look for degree/school names → education section
   - Look for skill keywords → skills section
c. If mapping fails, show the user what was found and ask for guidance

#### Step 3 — Generate tailored content

Same content generation as the HTML flow (Steps 1-11 above):
- Rewrite Professional Summary with JD keywords + exit narrative
- Reorder experience bullets by JD relevance
- Select top competencies from JD requirements
- Inject keywords naturally (NEVER invent)

**IMPORTANT — Character budget rule:** Each replacement text MUST be approximately the same length as the original text it replaces (within ±15% character count). If tailored content is longer, condense it. The Canva design has fixed-size text boxes — longer text causes overlapping with adjacent elements. Count the characters in each original element from Step 2 and enforce this budget when generating replacements.

#### Step 4 — Apply edits

a. `start-editing-transaction` on the duplicate design
b. `perform-editing-operations` with `find_and_replace_text` for each section:
   - Replace summary text with tailored summary
   - Replace each experience bullet with reordered/rewritten bullets
   - Replace competency/skills text with JD-matched terms
   - Replace project descriptions with top relevant projects
c. **Reflow layout after text replacement:**
   After applying all text replacements, the text boxes auto-resize but neighboring elements stay in place. This causes uneven spacing between work experience sections. Fix this:
   1. Read the updated element positions and dimensions from the `perform-editing-operations` response
   2. For each work experience section (top to bottom), calculate where the bullets text box ends: `end_y = top + height`
   3. The next section's header should start at `end_y + consistent_gap` (use the original gap from the template, typically ~30px)
   4. Use `position_element` to move the next section's date, company name, role title, and bullets elements to maintain even spacing
   5. Repeat for all work experience sections
d. **Verify layout before commit:**
   - `get-design-thumbnail` with the transaction_id and page_index=1
   - Visually inspect the thumbnail for: text overlapping, uneven spacing, text cut off, text too small
   - If issues remain, adjust with `position_element`, `resize_element`, or `format_text`
   - Repeat until layout is clean
d. Show the user the final preview and ask for approval
e. `commit-editing-transaction` to save (ONLY after user approval)

#### Step 5 — Export and download PDF

a. `export-design` the duplicate as PDF (format: a4 or letter based on JD location)
b. **IMMEDIATELY** download the PDF using Bash:
   ```bash
   curl -sL -o "output/cv-{candidate}-{company}-canva-{YYYY-MM-DD}.pdf" "{download_url}"
   ```
   The export URL is a pre-signed S3 link that expires in ~2 hours. Download it right away.
c. Verify the download:
   ```bash
   file output/cv-{candidate}-{company}-canva-{YYYY-MM-DD}.pdf
   ```
   Must show "PDF document". If it shows XML or HTML, the URL expired — re-export and retry.
d. Report: PDF path, file size, Canva design URL (for manual tweaking)

#### Error handling

- If `import-design-from-url` fails → fall back to HTML/PDF pipeline with message
- If text elements can't be mapped → warn user, show what was found, ask for manual mapping
- If `find_and_replace_text` finds no matches → try broader substring matching
- Always provide the Canva design URL so the user can edit manually if auto-edit fails

## ATS Check (post-generation)

After generating the DOCX/PDF, run the ATS checker if a JD is in context:

Read `modes/ats.md` and run the full ATS analysis inline. Save the `## H) ATS Score` section alongside the resume output. If called from auto-pipeline, skip — ATS check runs in Step 3.5 there.

## Post-generación

Actualizar tracker si la oferta ya está registrada: cambiar PDF de ❌ a ✅.
