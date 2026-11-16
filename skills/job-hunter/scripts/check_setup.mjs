#!/usr/bin/env node
// Checks that everything the job-hunter skill needs is in place. Run from the repo root:
//   node skills/job-hunter/scripts/check_setup.mjs
// Exit code 0 = ready; 1 = something must be fixed (the output says what).

import fs from "node:fs";
import { HOME, paths, loadSettings, listKeywordPacks } from "./config.mjs";
import { findBrowser } from "./build_resume.mjs";

let ok = true;
const pass = (m) => console.log(`  OK    ${m}`);
const fail = (m) => { ok = false; console.log(`  TODO  ${m}`); };
const warn = (m) => console.log(`  NOTE  ${m}`);

console.log(`Job Hunter setup check (home: ${HOME})`);

const [major] = process.versions.node.split(".").map(Number);
major >= 18 ? pass(`Node.js ${process.versions.node}`) : fail(`Node.js 18+ needed (found ${process.versions.node})`);

if (!fs.existsSync(paths.profileMd)) fail("profile/profile.md missing: run onboarding (see skills/job-hunter/references/onboarding.md)");
else {
  const txt = fs.readFileSync(paths.profileMd, "utf8");
  /<[A-Z _-]{3,}>/.test(txt) ? fail("profile/profile.md still has <PLACEHOLDER> fields to fill in") : pass("profile/profile.md");
}

if (!fs.existsSync(paths.master)) fail("profile/master_resume.json missing: run onboarding");
else {
  try {
    const m = JSON.parse(fs.readFileSync(paths.master, "utf8"));
    const problems = [];
    if (!m.name) problems.push("name");
    if (!m.contact?.email) problems.push("contact.email");
    if (!m.contact?.phone) problems.push("contact.phone");
    if (!(m.experience || []).length) problems.push("experience");
    if (/<[A-Z _-]{3,}>/.test(JSON.stringify(m))) problems.push("<PLACEHOLDER> values");
    problems.length ? fail(`profile/master_resume.json incomplete: ${problems.join(", ")}`) : pass("profile/master_resume.json");
  } catch (e) { fail(`profile/master_resume.json is not valid JSON: ${e.message}`); }
}

const s = loadSettings();
if (!fs.existsSync(paths.settings)) warn("profile/settings.json not found, using defaults (project-management pack, pass score 85)");
const available = listKeywordPacks();
const bad = s.keyword_packs.filter((p) => !available.includes(p));
bad.length ? fail(`unknown keyword packs in settings.json: ${bad.join(", ")} (available: ${available.join(", ")})`) : pass(`keyword packs: ${s.keyword_packs.join(", ")}`);

findBrowser() ? pass(`PDF renderer: ${findBrowser()}`) : fail("No Chrome, Edge or Chromium found; install one to build PDF resumes (or set CHROME_PATH)");

fs.mkdirSync(paths.jobs, { recursive: true });
pass(`work folder: ${paths.jobs}`);

console.log(ok ? "\nReady." : "\nFix the TODO items above, then run this again.");
process.exit(ok ? 0 : 1);
