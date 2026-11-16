// Shared paths and settings for the job-hunter scripts.
//
// Everything user-specific lives under JOB_HUNTER_HOME (default: the current directory,
// i.e. the repo root when the agent runs from there):
//   profile/profile.md          facts + standard answers (private, git-ignored)
//   profile/master_resume.json  the only source of resume content (private, git-ignored)
//   profile/settings.json       keyword packs, score thresholds, limits (private, git-ignored)
//   job-search/                 tracker.csv, jobs/<id>/..., apply-yourself.md (private, git-ignored)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const HOME = path.resolve(process.env.JOB_HUNTER_HOME || process.cwd());
export const PROFILE_DIR = path.join(HOME, "profile");
export const DATA_DIR = path.join(HOME, "job-search");
export const KEYWORDS_DIR = path.resolve(here, "..", "keywords");

export const paths = {
  profileMd: path.join(PROFILE_DIR, "profile.md"),
  master: path.join(PROFILE_DIR, "master_resume.json"),
  settings: path.join(PROFILE_DIR, "settings.json"),
  tracker: path.join(DATA_DIR, "tracker.csv"),
  jobs: path.join(DATA_DIR, "jobs"),
  applyYourself: path.join(DATA_DIR, "apply-yourself.md"),
};

export const DEFAULT_SETTINGS = {
  keyword_packs: ["project-management"],
  pass_score: 85,
  near_miss_score: 78,
  max_applications_per_run: 20,
};

export function loadSettings() {
  let s = {};
  if (fs.existsSync(paths.settings)) {
    try { s = JSON.parse(fs.readFileSync(paths.settings, "utf8")); }
    catch (e) { console.error(`Warning: could not parse ${paths.settings}: ${e.message}`); }
  }
  return { ...DEFAULT_SETTINGS, ...s };
}

export function listKeywordPacks() {
  return fs.readdirSync(KEYWORDS_DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
}

// Pack format: array of [term, weight, ...aliases]. A term starting with "!" is a certification
// (never to be claimed unless it is in the master resume).
export function loadVocab(packs) {
  const names = ["common", ...packs.filter((p) => p !== "common")];
  const seen = new Set();
  const vocab = [];
  for (const name of names) {
    const file = path.join(KEYWORDS_DIR, `${name}.json`);
    if (!fs.existsSync(file)) {
      console.error(`Warning: keyword pack "${name}" not found. Available: ${listKeywordPacks().join(", ")}`);
      continue;
    }
    for (const [rawTerm, weight, ...aliases] of JSON.parse(fs.readFileSync(file, "utf8"))) {
      const cert = rawTerm.startsWith("!");
      const term = cert ? rawTerm.slice(1) : rawTerm;
      if (seen.has(term)) continue;
      seen.add(term);
      vocab.push({ term, weight, aliases: aliases.length ? aliases : [term], cert, pack: name });
    }
  }
  return vocab;
}
