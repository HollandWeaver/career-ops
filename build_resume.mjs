/**
 * build_resume.mjs
 *
 * Converts a JSON resume data file into a pixel-perfect DOCX
 * matching the Holland Weaver / FanDuel reference formatting.
 *
 * Usage:
 *   node build_resume.mjs input.json "output/Holland Weaver resume Company Role.docx"
 *
 * Formatting specs extracted from FanDuel reference DOCX XML:
 *   - Page: 8.5" x 11", top=0.3125", bottom=0.11" (fixed)
 *   - L/R margins: adaptive (auto mode) or 0.5625" fixed
 *   - Name: full name, single size (default 26pt), bold, centered
 *   - Contact: centered, Calibri 10pt, · separators, LinkedIn hyperlinked
 *   - Section headers: ALL CAPS bold, bottom border #1F5C99, before=7pt after=3pt
 *   - Company lines: right tab flush to right margin, company bold, date bold #404040
 *   - Bullets: left=0.125" hanging=0.125", bold lead phrase then regular text
 *   - Skills: plain paragraphs, bold category + regular items
 */

import {
  Document, Packer, Paragraph, TextRun, Tab, TabStopType,
  AlignmentType, BorderStyle, LevelFormat, ExternalHyperlink
} from "docx";
import fs from "fs";

// ── Page constants (twips; 1440 twips = 1 inch) ─────────────────────────────

const PAGE_W   = 12240;  // 8.5"
const PAGE_H   = 15840;  // 11"
const MARGIN_TOP = 576;  // 0.4" — symmetric with bottom
const MARGIN_BOT = 576;  // 0.4" — symmetric with top

// Default L/R margin (used in fixed mode and as binary-search minimum)
const MARGIN_LR_DEFAULT = 810;   // 0.5625"
const MARGIN_LR_MIN     = 720;   // 0.5" — tightest allowed
const MARGIN_LR_MAX     = 1440;  // 1.0" — widest allowed

// ── Typography constants (points) ────────────────────────────────────────────

const BODY_PT          = 10;    // body font size
const LINE_HEIGHT_PT   = 10.2;  // Word single-spacing for 10pt Calibri (empirically calibrated)
const BULLET_INDENT    = 180;   // 0.125" in twips

// AVG character width for Calibri 10pt mixed-case prose.
// Tune this if bottom whitespace is off by more than 2 lines after first run.
// Smaller value → more chars/line → fewer wraps → shorter estimate → margins widen more
// Larger value → fewer chars/line → more wraps → taller estimate → margins widen less
const AVG_CHAR_WIDTH_PT = 5.5;

// Spacing constants (twips; divide by 20 to get points)
const SECTION_BEFORE   = 140;  // 7pt
const SECTION_AFTER    = 60;   // 3pt
const COMPANY_SPACE    = 120;  // 6pt (between companies in same section)

const BLUE     = "1F5C99";
const DATE_GRAY= "404040";
const FONT     = "Calibri";

// ── TextRun wrapper (always Calibri) ─────────────────────────────────────────

function run(opts) {
  return new TextRun({ font: { name: FONT }, ...opts });
}

// ── Paragraph builders ────────────────────────────────────────────────────────

function sectionHeader(text) {
  return new Paragraph({
    children: [run({ text, bold: true })],
    spacing: { before: SECTION_BEFORE, after: SECTION_AFTER },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 8, space: 2, color: BLUE },
    },
  });
}

function companyLine(company, role, location, dates, spaceBefore = 0, marginLR = MARGIN_LR_DEFAULT) {
  // Right tab flush to right margin: page_width minus right margin minus small buffer
  const rightTab = PAGE_W - marginLR - 80;
  return new Paragraph({
    spacing: { before: spaceBefore },
    tabStops: [{ type: TabStopType.RIGHT, position: rightTab }],
    children: [
      run({ text: company, bold: true }),
      run({ text: " | " }),
      run({ text: role + " | " + location, italics: true }),
      run({ children: [new Tab()] }),
      run({ text: dates, bold: true, color: DATE_GRAY }),
    ],
  });
}

function bullet(lead, rest) {
  return new Paragraph({
    numbering: { reference: "bullet-1", level: 0 },
    indent: { left: BULLET_INDENT, hanging: BULLET_INDENT },
    children: [
      run({ text: lead, bold: true }),
      ...parseBoldInline(rest),
    ],
  });
}

function skillLine(category, items) {
  return new Paragraph({
    children: [
      run({ text: category, bold: true }),
      run({ text: " " + items }),
    ],
  });
}

// ── Inline bold parser (for summary) ─────────────────────────────────────────

function parseBoldInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map(part =>
    part.startsWith("**") && part.endsWith("**")
      ? run({ text: part.slice(2, -2), bold: true })
      : run({ text: part })
  );
}

// ── Bullet splitter ───────────────────────────────────────────────────────────

function splitBullet(text) {
  const match = text.match(/^\*\*(.+?)\*\*(.*)$/s);
  if (match) return [match[1], match[2]];
  const idx = text.search(/[,:;]/);
  if (idx > 0 && idx < 60) return [text.slice(0, idx + 1), text.slice(idx + 1)];
  return [text, ""];
}

// ── Height estimator ──────────────────────────────────────────────────────────
//
// Walks the same structure as buildDocument() and accumulates estimated
// vertical height in points. Used by the adaptive margin binary search.

function twipToPt(t) { return t / 20; }

function estimateLines(text, charsPerLine) {
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

function estimateContentHeight(data, marginLR) {
  const { header, summary, experience, projects, education, skills } = data;

  const contentWidthPt = (PAGE_W - marginLR * 2) / 20;
  const charsPerLine   = contentWidthPt / AVG_CHAR_WIDTH_PT;

  let h = 0;

  // Name
  const namePt = ((header.name_size ?? 52) / 2);
  h += namePt * 1.2 + 4; // line + small gap

  // Contact — rendered at 9pt, so chars-per-line is wider than body
  const contactParts = [header.email, header.phone, header.location];
  if (header.linkedin) contactParts.push(header.linkedin);
  if (header.github)   contactParts.push(header.github);
  const contactStr = contactParts.join(" · ");
  const contactCharsPerLine = contentWidthPt / (AVG_CHAR_WIDTH_PT * 0.9); // 9pt ≈ 90% of 10pt char width
  h += estimateLines(contactStr, contactCharsPerLine) * LINE_HEIGHT_PT + 4;

  // Each section: header + entries
  function addHeader() {
    h += LINE_HEIGHT_PT                          // header text line
      + twipToPt(SECTION_BEFORE)
      + twipToPt(SECTION_AFTER)
      + 1;                                       // border
  }

  function addCompanyLine(spaceBefore = 0) {
    h += LINE_HEIGHT_PT + twipToPt(spaceBefore);
  }

  function addBullet(text) {
    const [lead, rest] = splitBullet(text);
    const fullText = lead + rest;
    h += estimateLines(fullText, charsPerLine) * LINE_HEIGHT_PT;
  }

  function addSkillLine(category, items) {
    const fullText = category + " " + items;
    h += estimateLines(fullText, charsPerLine) * LINE_HEIGHT_PT;
  }

  // Summary
  addHeader();
  h += estimateLines(summary.replace(/\*\*/g, ""), charsPerLine) * LINE_HEIGHT_PT;

  // Experience
  addHeader();
  experience.forEach((job, i) => {
    addCompanyLine(i > 0 ? COMPANY_SPACE : 0);
    job.bullets.forEach(b => addBullet(b));
  });

  // Projects
  addHeader();
  projects.forEach((proj, i) => {
    addCompanyLine(i > 0 ? COMPANY_SPACE : 0);
    proj.bullets.forEach(b => addBullet(b));
  });

  // Education
  addHeader();
  education.forEach((edu) => {
    addCompanyLine(0);
    (edu.bullets || []).forEach(b => addBullet(b));
  });

  // Skills
  addHeader();
  skills.forEach(s => addSkillLine(s.category, s.items));

  return h;
}

// ── Adaptive margin binary search ─────────────────────────────────────────────

function findOptimalMarginLR(data, layout) {
  const targetLines = layout.target_bottom_lines ?? 4;
  const lrMin = layout.margin_lr_min ?? MARGIN_LR_MIN;
  const lrMax = layout.margin_lr_max ?? MARGIN_LR_MAX;

  const pageContentPt   = (PAGE_H - MARGIN_TOP - MARGIN_BOT) / 20;
  const targetBufferPt  = targetLines * LINE_HEIGHT_PT;
  const targetHeightPt  = pageContentPt - targetBufferPt;

  // If content is already taller than page at minimum margin, bail out
  if (estimateContentHeight(data, lrMin) >= pageContentPt) {
    console.warn("⚠ Content may exceed one page. Using minimum margins.");
    return lrMin;
  }

  let lo = lrMin, hi = lrMax;

  for (let i = 0; i < 20; i++) {
    const mid = Math.round((lo + hi) / 2);
    const h   = estimateContentHeight(data, mid);

    if (h < targetHeightPt) {
      lo = mid;  // content too short → widen margins (increase marginLR)
    } else {
      hi = mid;  // content fills well → tighten margins
    }

    if (hi - lo < 36) break; // converged (< ~0.025")
  }

  const result = Math.round((lo + hi) / 2);
  const finalH = estimateContentHeight(data, result);
  const bottomLines = (pageContentPt - finalH) / LINE_HEIGHT_PT;
  console.log(`  Margins: ${(result / 1440).toFixed(3)}" L/R | estimated bottom whitespace: ~${bottomLines.toFixed(1)} lines`);
  return result;
}

// ── Main builder ──────────────────────────────────────────────────────────────

function buildDocument(data) {
  const { header, summary, experience, projects, education, skills } = data;

  // Determine margins
  const layout   = data.layout ?? {};
  const autoMode = (layout.margin_mode ?? "auto") === "auto";
  const marginLR = autoMode
    ? findOptimalMarginLR(data, layout)
    : MARGIN_LR_DEFAULT;

  // Numbering
  const numberingConfigs = [{
    reference: "bullet-1",
    levels: [{
      level: 0,
      format: LevelFormat.BULLET,
      text: "\u2022",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: BULLET_INDENT, hanging: BULLET_INDENT } } },
    }],
  }];

  const children = [];

  // Name
  const nameSz = header.name_size ?? 52;
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [run({ text: header.first_name + " " + header.last_name, bold: true, size: nameSz })],
  }));

  // Contact — 9pt so 5-item line stays on one row
  const cRun = (opts) => run({ size: 18, ...opts }); // 18 half-pts = 9pt
  const contactChildren = [
    cRun({ text: header.email }),
    cRun({ text: " · " }),
    cRun({ text: header.phone }),
    cRun({ text: " · " }),
    cRun({ text: header.location }),
  ];
  if (header.linkedin) {
    contactChildren.push(cRun({ text: " · " }));
    contactChildren.push(new ExternalHyperlink({
      link: header.linkedin_url || header.linkedin,
      children: [new TextRun({ text: header.linkedin, size: 18, font: { name: FONT }, style: "Hyperlink" })],
    }));
  }
  if (header.github) {
    contactChildren.push(cRun({ text: " · " }));
    contactChildren.push(new ExternalHyperlink({
      link: header.github_url || ("https://" + header.github),
      children: [new TextRun({ text: header.github, size: 18, font: { name: FONT }, style: "Hyperlink" })],
    }));
  }
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: contactChildren }));

  // Summary
  children.push(sectionHeader("SUMMARY"));
  children.push(new Paragraph({ children: parseBoldInline(summary) }));

  // Experience
  children.push(sectionHeader("PROFESSIONAL EXPERIENCE"));
  experience.forEach((job, i) => {
    children.push(companyLine(job.company, job.role, job.location, job.dates, i > 0 ? COMPANY_SPACE : 0, marginLR));
    job.bullets.forEach(b => { const [lead, rest] = splitBullet(b); children.push(bullet(lead, rest)); });
  });

  // Projects
  children.push(sectionHeader("PROJECTS"));
  projects.forEach((proj, i) => {
    children.push(companyLine(proj.name, proj.role, proj.context, proj.dates, i > 0 ? COMPANY_SPACE : 0, marginLR));
    proj.bullets.forEach(b => { const [lead, rest] = splitBullet(b); children.push(bullet(lead, rest)); });
  });

  // Education
  children.push(sectionHeader("EDUCATION"));
  education.forEach(edu => {
    children.push(companyLine(edu.institution, edu.degree, edu.gpa, edu.dates, 0, marginLR));
    (edu.bullets || []).forEach(b => { const [lead, rest] = splitBullet(b); children.push(bullet(lead, rest)); });
  });

  // Skills
  children.push(sectionHeader("TECHNICAL SKILLS"));
  skills.forEach(s => children.push(skillLine(s.category, s.items)));

  return new Document({
    defaultFont: FONT,
    numbering: { config: numberingConfigs },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN_TOP, right: marginLR, bottom: MARGIN_BOT, left: marginLR },
        },
      },
      children,
    }],
  });
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const [,, inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error("Usage: node build_resume.mjs <input.json> <output.docx>");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const doc  = buildDocument(data);

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`✓ Resume written to ${outputPath}`);
}).catch(err => {
  console.error("Error building resume:", err);
  process.exit(1);
});
