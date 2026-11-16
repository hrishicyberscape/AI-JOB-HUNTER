// Self-contained tests for the job-hunter scripts. Uses the example profile in a temp home,
// so it never touches a real profile. Run: npm test   (or: node tests/run.mjs)

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scripts = path.join(root, "skills/job-hunter/scripts");
const home = fs.mkdtempSync(path.join(os.tmpdir(), "job-hunter-test-"));
fs.mkdirSync(path.join(home, "profile"));
fs.copyFileSync(path.join(root, "profile/master_resume.example.json"), path.join(home, "profile/master_resume.json"));
fs.copyFileSync(path.join(root, "profile/settings.example.json"), path.join(home, "profile/settings.json"));

const env = { ...process.env, JOB_HUNTER_HOME: home };
const run = (script, args, allowFail = false) => {
  try { return execFileSync(process.execPath, [path.join(scripts, script), ...args], { env, cwd: home, encoding: "utf8" }); }
  catch (e) { if (allowFail) return (e.stdout || "") + (e.stderr || ""); throw e; }
};

let failures = 0;
const test = async (name, fn) => {
  try { await fn(); console.log(`  pass  ${name}`); }
  catch (e) { failures++; console.log(`  FAIL  ${name}\n        ${e.message}`); }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const master = JSON.parse(fs.readFileSync(path.join(home, "profile/master_resume.json"), "utf8"));
const tailored = structuredClone(master);
delete tailored._note;
tailored.experience.forEach((e) => delete e.bullet_bank);
const write = (name, data) => { const p = path.join(home, name); fs.writeFileSync(p, typeof data === "string" ? data : JSON.stringify(data, null, 2)); return p; };

const jd = write("jd.txt", `Title: Software Project Manager
Company: Example Co
Location: Remote

We need a Software Project Manager with 5+ years of experience.
- Manage multiple client projects using Agile and Scrum in Jira and Confluence.
- Own release planning, risk management and stakeholder communication.
- Coordinate QA and UAT with the testing team.
- ServiceNow experience is a plus. PMP certification is mandatory.
- Fluent Arabic required.`);

console.log("job-hunter tests");

await test("ats_score scores a matching resume and writes JSON", () => {
  const r = write("resume.json", tailored);
  const out = path.join(home, "score.json");
  run("ats_score.mjs", ["--resume", r, "--jd", jd, "--out", out]);
  const s = JSON.parse(fs.readFileSync(out, "utf8"));
  assert(s.score >= 60 && s.score <= 100, `score out of range: ${s.score}`);
  assert(s.matched.includes("agile") && s.matched.includes("jira"), "expected agile and jira matched");
  assert(s.missing.some((m) => m.term === "pmp" && m.certification), "PMP should be missing and marked as a certification");
  assert(s.unverified.length === 0, `untouched master should have no unverified terms: ${JSON.stringify(s.unverified)}`);
});

await test("ats_score flags mandatory certification and language", () => {
  const s = JSON.parse(fs.readFileSync(path.join(home, "score.json"), "utf8"));
  assert(s.flags.some((f) => /pmp/i.test(f)), "expected PMP flag");
  assert(s.flags.some((f) => /arabic/i.test(f)), "expected Arabic flag");
});

await test("ats_score auto-detects tools not in any keyword pack", () => {
  const s = JSON.parse(fs.readFileSync(path.join(home, "score.json"), "utf8"));
  assert(s.missing.some((m) => m.term === "servicenow" && m.auto_detected), "expected ServiceNow auto-detected");
});

await test("ats_score catches fabricated skills (truth check)", () => {
  const fake = structuredClone(tailored);
  fake.competencies.push("PMP Certified", "Kubernetes");
  const r = write("fake.json", fake);
  const out = path.join(home, "fake-score.json");
  run("ats_score.mjs", ["--resume", r, "--jd", jd, "--packs", "project-management,software-engineering", "--out", out]);
  const s = JSON.parse(fs.readFileSync(out, "utf8"));
  const aliases = s.unverified.map((u) => u.alias);
  assert(aliases.includes("pmp"), `pmp should be unverified, got ${aliases}`);
  assert(aliases.includes("kubernetes"), `kubernetes should be unverified, got ${aliases}`);
});

await test("tracker add / dedupe / update / seen / list", () => {
  const t = path.join(home, "t.csv");
  run("tracker.mjs", ["add", "--file", t, "--id", "a-1", "--site", "linkedin", "--company", "Comma, Inc", "--title", "PM", "--url", "https://x.test/jobs/1?ref=z"]);
  const dup = run("tracker.mjs", ["add", "--file", t, "--id", "a-2", "--url", "https://x.test/jobs/1/"]);
  assert(/exists/.test(dup), "duplicate URL should be rejected");
  run("tracker.mjs", ["update", "a-1", "--file", t, "--status", "applied", "--score", "88"]);
  assert(run("tracker.mjs", ["seen", "https://x.test/jobs/1", "--file", t]).trim() === "yes", "seen should be yes");
  const list = run("tracker.mjs", ["list", "--file", t]);
  assert(/applied 1/.test(list) && /Comma, Inc/.test(list), `unexpected list output: ${list}`);
});

await test("check_setup passes with the example profile", () => {
  fs.writeFileSync(path.join(home, "profile/profile.md"), "# Candidate profile\n- Name: Alex Example\n");
  const out = run("check_setup.mjs", [], true);
  assert(/master_resume\.json/.test(out) && /profile\.md/.test(out), out);
});

await test("build_resume renders a PDF (skipped if no browser)", async () => {
  const { findBrowser } = await import(pathToFileURL(path.join(scripts, "build_resume.mjs")).href);
  if (!findBrowser()) { console.log("        (no Chrome/Edge/Chromium found, skipped)"); return; }
  const out = path.join(home, "out.pdf");
  run("build_resume.mjs", [path.join(home, "resume.json"), out]);
  const head = fs.readFileSync(out).subarray(0, 5).toString();
  assert(head === "%PDF-", "output is not a PDF");
});

fs.rmSync(home, { recursive: true, force: true });
console.log(failures ? `\n${failures} test(s) failed` : "\nAll tests passed");
process.exit(failures ? 1 : 0);
