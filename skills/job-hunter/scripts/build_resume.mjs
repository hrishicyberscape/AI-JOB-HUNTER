#!/usr/bin/env node
// Build an ATS-friendly PDF resume from a resume JSON (same shape as master_resume.json).
//
// Usage: node build_resume.mjs <resume.json> <output.pdf> [--keep-html]
//
// ATS-friendly by design: single column, no tables/text boxes/images/icons, standard section
// headings, real selectable text, contact details in the body (not a header/footer), common fonts.
// Rendered with an installed Chrome / Edge / Chromium in headless mode (set CHROME_PATH to override).

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

const BROWSERS = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/microsoft-edge",
].filter(Boolean);

export const findBrowser = () => BROWSERS.find((b) => fs.existsSync(b)) || null;

const h = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function renderHtml(r) {
  const contact = [r.contact?.phone, r.contact?.email, r.contact?.location, r.contact?.linkedin, r.contact?.portfolio]
    .filter(Boolean).map(h).join(" | ");
  const section = (title, body) => (body ? `<h2>${title}</h2>${body}` : "");
  const experience = (r.experience || []).map((e) => `
  <div class="job">
    <div class="row"><span class="company">${h(e.company)}${e.location ? `, ${h(e.location)}` : ""}</span><span class="dates">${h(e.dates)}</span></div>
    <div class="title">${h(e.title)}</div>
    <ul>${(e.bullets || []).map((b) => `<li>${h(b)}</li>`).join("")}</ul>
  </div>`).join("");
  const tools = (r.tools || []).map((t) => `<p class="tools"><b>${h(t.label)}:</b> ${h(t.items)}</p>`).join("");
  const education = (r.education || [])
    .map((e) => `<div class="row"><span><b>${h(e.degree)}</b>, ${h(e.school)}</span><span class="dates">${h(e.dates)}</span></div>`).join("");
  const list = (xs) => ((xs || []).length ? `<ul>${xs.map((c) => `<li>${h(c)}</li>`).join("")}</ul>` : "");
  const languages = Array.isArray(r.languages) ? r.languages.join(", ") : r.languages;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${h(r.name)} - Resume</title>
<style>
  @page { size: A4; margin: 11mm 13mm; }
  body { font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.25; color: #111; margin: 0; }
  h1 { font-size: 20pt; margin: 0; letter-spacing: .5px; }
  .headline { font-size: 11.5pt; font-weight: bold; color: #1f3a5f; margin: 2px 0; }
  .contact { font-size: 10pt; margin-bottom: 4px; }
  h2 { font-size: 11pt; text-transform: uppercase; color: #1f3a5f; border-bottom: 1px solid #1f3a5f; margin: 8px 0 4px; padding-bottom: 1px; break-after: avoid; }
  p { margin: 0 0 4px; }
  ul { margin: 2px 0 6px 0; padding-left: 16px; }
  li { margin-bottom: 1px; }
  .job, .row { break-inside: avoid; }
  .row { display: flex; justify-content: space-between; gap: 12px; }
  .company { font-weight: bold; }
  .title { font-style: italic; }
  .dates { white-space: nowrap; }
  .job { margin-bottom: 4px; }
  .tools { margin-bottom: 2px; }
</style></head><body>
<h1>${h(r.name)}</h1>
<div class="headline">${h(r.headline)}</div>
<div class="contact">${contact}</div>
${section("Professional Summary", r.summary ? `<p>${h(r.summary)}</p>` : "")}
${section("Core Competencies", (r.competencies || []).length ? `<p>${r.competencies.map(h).join(" &bull; ")}</p>` : "")}
${section("Professional Experience", experience)}
${section("Projects", list(r.projects))}
${section("Tools &amp; Technologies", tools)}
${section("Education", education)}
${section("Certifications", list(r.certifications))}
${section("Languages", languages ? `<p>${h(languages)}</p>` : "")}
</body></html>`;
}

export function buildPdf(resume, outPath, { keepHtml = false } = {}) {
  const browser = findBrowser();
  if (!browser) throw new Error("No Chrome, Edge or Chromium found to render the PDF (set CHROME_PATH).");
  const outAbs = path.resolve(outPath);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  const htmlPath = outAbs.replace(/\.pdf$/i, "") + ".html";
  fs.writeFileSync(htmlPath, renderHtml(resume));
  // Throwaway browser profile, so this never touches the user's own browser session.
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "resume-chrome-"));
  try {
    execFileSync(browser, [
      "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
      `--user-data-dir=${profileDir}`, "--no-pdf-header-footer", `--print-to-pdf=${outAbs}`,
      pathToFileURL(htmlPath).href,
    ], { stdio: "pipe", timeout: 60000 });
  } finally {
    fs.rmSync(profileDir, { recursive: true, force: true });
    if (!keepHtml) fs.rmSync(htmlPath, { force: true });
  }
  if (!fs.existsSync(outAbs)) throw new Error("PDF was not created.");
  return outAbs;
}

// CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , inPath, outPath, ...rest] = process.argv;
  if (!inPath || !outPath) {
    console.error("Usage: node build_resume.mjs <resume.json> <output.pdf> [--keep-html]");
    process.exit(2);
  }
  try {
    const out = buildPdf(JSON.parse(fs.readFileSync(inPath, "utf8")), outPath, { keepHtml: rest.includes("--keep-html") });
    console.log(`Built ${out} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
