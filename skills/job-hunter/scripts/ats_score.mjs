#!/usr/bin/env node
// ATS-style match score for a tailored resume (JSON) against a job description (text).
//
// Usage:
//   node ats_score.mjs --resume <resume.json> --jd <jd.txt> [--master <master.json>] [--packs a,b] [--out <score.json>]
//
// Defaults: --master = profile/master_resume.json, --packs = profile/settings.json "keyword_packs".
// jd.txt should start with header lines "Title: ...", "Company: ...", "Location: ...", then the full text.
//
// Score (0-100) = 65% keyword coverage + 15% title match + 10% experience fit + 10% format.
// Real ATS products (Workday, Taleo, Greenhouse, Naukri RMS, ...) each score differently. This is
// a consistent, explainable proxy so every resume is judged the same way.
//
// The "unverified" list names skill terms that appear in the tailored resume but nowhere in the
// master resume: possible fabrication, to be fixed before the resume is used.

import fs from "node:fs";
import { paths, loadSettings, loadVocab } from "./config.mjs";

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith("--")) args[argv[i].slice(2)] = argv[i + 1], i++;
if (!args.resume || !args.jd) {
  console.error("Usage: node ats_score.mjs --resume resume.json --jd jd.txt [--master master.json] [--packs a,b] [--out score.json]");
  process.exit(2);
}

const settings = loadSettings();
const packs = args.packs ? args.packs.split(",").map((s) => s.trim()) : settings.keyword_packs;
const VOCAB = loadVocab(packs);
const PASS = settings.pass_score, NEAR = settings.near_miss_score;

const STOP = new Set(
  "a an and or the of for to in on at with by from as is are be will you your we our this that it its job role position team company senior junior lead sr jr ii iii i".split(" ")
);
// Capitalised words that are not skills; used to keep auto-detected terms clean.
const AUTO_STOP = new Set(
  ("we you our the a an and or in on at to for of with is are be as this that it if job role title company location about responsibilities requirements " +
   "qualifications benefits salary experience years year team teams work working ability strong excellent good must should will would preferred plus " +
   "required key skills knowledge understanding including including: what who why how apply full time part remote hybrid onsite on-site office " +
   "january february march april may june july august september october november december monday friday " +
   "uae dubai abu dhabi riyadh jeddah doha kuwait muscat manama india bangalore bengaluru mumbai pune hyderabad chennai delhi kochi " +
   "llc ltd pvt inc fz fze limited group").split(" ")
);

const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const countAlias = (text, alias) => (text.match(new RegExp(`(?<![a-z0-9])${esc(alias)}(?![a-z0-9])`, "g")) || []).length;
const countTerm = (text, aliases) => aliases.reduce((n, a) => n + countAlias(text, a), 0);

function flatten(obj, skip = new Set()) {
  const out = [];
  const walk = (v, k) => {
    if (skip.has(k)) return;
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach((x) => walk(x));
    else if (v && typeof v === "object") Object.entries(v).forEach(([kk, vv]) => walk(vv, kk));
  };
  walk(obj);
  return out.join("\n");
}

// ---------- load ----------
const resume = JSON.parse(fs.readFileSync(args.resume, "utf8"));
const jdRaw = fs.readFileSync(args.jd, "utf8");
const jd = norm(jdRaw);
const resumeText = norm(flatten(resume, new Set(["_note", "bullet_bank"])));
const masterPath = args.master || (fs.existsSync(paths.master) ? paths.master : null);
const master = masterPath ? JSON.parse(fs.readFileSync(masterPath, "utf8")) : null;
const masterText = master ? norm(flatten(master, new Set(["_note"]))) : null;

// ---------- auto-detected JD terms (tools/tech not in any pack, e.g. "ServiceNow", "SAP S/4HANA") ----------
const known = new Set(VOCAB.flatMap((v) => v.aliases));
// Words of the JD's own title are scored by the title check, and may legitimately appear in the headline.
const titleWords = new Set(norm((jdRaw.match(/^\s*title\s*:\s*(.+)$/im) || [])[1] || "").split(/[^a-z0-9+#]+/).filter(Boolean));
const auto = new Map();
const body = jdRaw.replace(/^\s*(title|company|location)\s*:.*$/gim, "");
for (const m of body.matchAll(/(?<![\w.])([A-Z][A-Za-z0-9]*(?:[.+#/-][A-Za-z0-9+#]+)*|[A-Z]{2,}[0-9]*)(?![\w])/g)) {
  const raw = m[1];
  const prev = body.slice(Math.max(0, m.index - 2), m.index);
  const sentenceStart = /^$|[.!?:\n•\-*]\s?$/.test(prev) || m.index === 0;
  const t = raw.toLowerCase();
  if (t.length < 2 || AUTO_STOP.has(t) || STOP.has(t) || known.has(t) || titleWords.has(t)) continue;
  if (t.includes("/") && t.split("/").some((p) => AUTO_STOP.has(p) || STOP.has(p))) continue; // "IT/software"
  const techy = /[A-Z0-9.+#/]/.test(raw.slice(1)); // CamelCase, acronyms, versions, dotted names (ServiceNow, AWS, S/4HANA, Node.js)
  if (sentenceStart && !techy) continue;
  auto.set(t, (auto.get(t) || 0) + 1);
}
const autoTerms = [...auto.entries()]
  .filter(([t, n]) => n >= 1)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([t]) => ({ term: t, weight: 1, aliases: [t], cert: false, pack: "auto" }));
const ALL = [...VOCAB, ...autoTerms];

// ---------- 1. keyword coverage ----------
let totalW = 0, gotW = 0;
const matched = [], missing = [];
for (const v of ALL) {
  const jdCount = countTerm(jd, v.aliases);
  if (!jdCount) continue;
  const weight = v.weight * (jdCount >= 3 ? 1.5 : jdCount === 2 ? 1.25 : 1);
  totalW += weight;
  if (countTerm(resumeText, v.aliases) > 0) { gotW += weight; matched.push(v.term); }
  else missing.push({
    term: v.term,
    weight: +weight.toFixed(2),
    jd_mentions: jdCount,
    certification: v.cert,
    auto_detected: v.pack === "auto",
    in_master: masterText ? countTerm(masterText, v.aliases) > 0 : null,
  });
}
missing.sort((a, b) => b.weight - a.weight);
const keywordScore = totalW ? (gotW / totalW) * 100 : 100;

// ---------- 2. title match ----------
const header = (name) => (jdRaw.match(new RegExp(`^\\s*${name}\\s*:\\s*(.+)$`, "im")) || [])[1]?.trim() || "";
const jdTitle = header("Title");
const titleTokens = norm(jdTitle).split(/[^a-z0-9+#]+/).filter((t) => t && !STOP.has(t));
const resumeTitles = norm([resume.headline, resume.summary, ...(resume.experience || []).map((e) => e.title)].join(" "));
const titleHits = titleTokens.filter((t) => countAlias(resumeTitles, t) > 0);
const titleScore = titleTokens.length ? (titleHits.length / titleTokens.length) * 100 : 100;

// ---------- 3. experience fit ----------
const years = [...jdRaw.matchAll(/(\d{1,2})\s*\+?\s*(?:-|to|–)?\s*(\d{1,2})?\s*\+?\s*(?:years|yrs)/gi)]
  .map((m) => parseInt(m[1], 10))
  .filter((n) => n > 0 && n < 30);
const requiredYears = years.length ? Math.max(...years.slice(0, 3)) : null;
const startYears = (resume.experience || [])
  .map((e) => parseInt((String(e.dates).match(/(19|20)\d{2}/) || [])[0], 10))
  .filter(Boolean);
const candidateYears = startYears.length ? new Date().getFullYear() - Math.min(...startYears) : 0;
let expScore = 100;
if (requiredYears !== null) {
  const gap = requiredYears - candidateYears;
  expScore = gap <= 0 ? 100 : gap <= 2 ? 60 : 20;
}

// ---------- 4. format / structure ----------
const fmt = [];
const check = (ok, msg) => fmt.push({ ok: !!ok, check: msg });
const bullets = (resume.experience || []).flatMap((e) => e.bullets || []);
const words = resumeText.split(/\s+/).length;
check(resume.name && resume.contact?.email && resume.contact?.phone, "name, email and phone present");
check(resume.summary && resume.summary.length > 150, "professional summary present (150+ chars)");
check((resume.competencies || []).length >= 8, "8+ core competencies");
check((resume.experience || []).every((e) => e.company && e.title && e.dates), "every job has company, title, dates");
check(bullets.filter((b) => /\d/.test(b)).length >= 3, "3+ quantified bullets");
check((resume.education || []).length >= 1, "education section present");
check(words >= 300 && words <= 900, `length in range (${words} words, 300-900)`);
const formatScore = (fmt.filter((f) => f.ok).length / fmt.length) * 100;

// ---------- 5. truth check ----------
const unverified = [];
if (masterText) {
  for (const v of ALL) for (const a of v.aliases)
    if (countAlias(resumeText, a) > 0 && countAlias(masterText, a) === 0) unverified.push({ term: v.term, alias: a });
}

// ---------- 6. fit flags ----------
const flags = [];
const LANGS = ["arabic", "french", "german", "spanish", "japanese", "mandarin", "chinese", "korean", "dutch", "italian", "portuguese", "russian", "turkish", "hindi", "tamil", "malayalam"];
for (const l of LANGS) if (countAlias(jd, l) && !(masterText && countAlias(masterText, l))) flags.push(`JD mentions ${l}, which isn't in your resume: check whether it is mandatory`);
if (/\b(nationals? only|locals? only|uae nationals?|saudi nationals?|qatari nationals?|emirati|saudi[sz]ation|emirati[sz]ation|transferable visa|visa transferable|must be (?:based|located) in|must have (?:the )?right to work)\b/i.test(jdRaw))
  flags.push("JD restricts nationality, location or work authorisation: compare with the visa status in profile.md");
for (const v of VOCAB.filter((v) => v.cert)) {
  const a = v.aliases.map(esc).join("|");
  const req = new RegExp(`(?:${a})[^.\\n]{0,50}\\b(?:mandatory|required|must)\\b|\\b(?:mandatory|required|must)\\b[^.\\n]{0,50}(?:${a})`, "i");
  if (req.test(jdRaw) && !(masterText && countTerm(masterText, v.aliases))) flags.push(`JD may require certification "${v.term}", which isn't in your resume`);
}

// ---------- result ----------
const score = Math.round(0.65 * keywordScore + 0.15 * titleScore + 0.1 * expScore + 0.1 * formatScore);
const result = {
  score,
  verdict: score >= PASS ? `PASS (>=${PASS})` : score >= NEAR ? `NEAR MISS (${NEAR}-${PASS - 1})` : `LOW MATCH (<${NEAR})`,
  jd_title: jdTitle || "(no 'Title:' header in jd.txt)",
  packs: ["common", ...packs],
  breakdown: { keywords: Math.round(keywordScore), title: Math.round(titleScore), experience: Math.round(expScore), format: Math.round(formatScore) },
  experience: { required_years: requiredYears, candidate_years: candidateYears },
  matched,
  missing,
  missing_but_in_master: missing.filter((m) => m.in_master).map((m) => m.term),
  title_tokens_missing: titleTokens.filter((t) => !titleHits.includes(t)),
  format_checks: fmt,
  unverified,
  flags,
};

if (args.out) fs.writeFileSync(args.out, JSON.stringify(result, null, 2));
console.log(`ATS score: ${score}  [${result.verdict}]  keywords ${result.breakdown.keywords} | title ${result.breakdown.title} | experience ${result.breakdown.experience} | format ${result.breakdown.format}`);
if (result.missing_but_in_master.length) console.log(`Missing but TRUE (in master), work these in: ${result.missing_but_in_master.join(", ")}`);
const notHeld = missing.filter((m) => m.in_master === false && !m.auto_detected).map((m) => m.term);
if (notHeld.length) console.log(`Missing and NOT in master, do not add: ${notHeld.join(", ")}`);
const autoMissing = missing.filter((m) => m.auto_detected && m.in_master === false).map((m) => m.term);
if (autoMissing.length) console.log(`Other JD terms not in master (check; add only if true): ${autoMissing.join(", ")}`);
if (result.title_tokens_missing.length) console.log(`Title words missing: ${result.title_tokens_missing.join(", ")}`);
if (unverified.length) console.log(`UNVERIFIED terms (not in master, fix or justify): ${[...new Set(unverified.map((u) => u.alias))].join(", ")}`);
for (const f of flags) console.log(`FLAG: ${f}`);
for (const f of fmt.filter((f) => !f.ok)) console.log(`Format: ${f.check}: FAILED`);
