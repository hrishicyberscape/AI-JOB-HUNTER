#!/usr/bin/env node
// Application tracker (CSV, opens in Excel).
//
//   node tracker.mjs add --id <id> --site linkedin --company "X" --title "Y" --location "Dubai" --url <url> --apply_type quick|external [--status found] [--notes ".."]
//   node tracker.mjs update <id> --status applied [--score 88] [--resume path] [--notes ".."]
//   node tracker.mjs seen <url-or-id>        -> prints "yes" / "no"
//   node tracker.mjs list [--status approved]
//
// Default file: <JOB_HUNTER_HOME>/job-search/tracker.csv  (override with --file)
// Statuses: found, skipped, low-match, tailored, approved, applied, apply-yourself, closed,
//           interview, rejected, offer

import fs from "node:fs";
import path from "node:path";
import { paths } from "./config.mjs";

const COLS = ["id", "date_found", "site", "company", "title", "location", "url", "apply_type", "score", "status", "date_applied", "resume", "notes"];
const argv = process.argv.slice(2);
const cmd = argv[0];
const opts = {};
const pos = [];
for (let i = 1; i < argv.length; i++) {
  if (argv[i].startsWith("--")) { opts[argv[i].slice(2)] = argv[i + 1] ?? ""; i++; }
  else pos.push(argv[i]);
}
const file = opts.file || paths.tracker;
delete opts.file;
const today = new Date().toISOString().slice(0, 10);

function parseCSV(text) {
  const rows = []; let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}
const cell = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

function load() {
  if (!fs.existsSync(file)) return [];
  const rows = parseCSV(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")).filter((r) => r.some((x) => x !== ""));
  const head = rows.shift() || COLS;
  return rows.map((r) => Object.fromEntries(COLS.map((c) => [c, r[head.indexOf(c)] ?? ""])));
}
function save(items) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // BOM so Excel opens it as UTF-8
  fs.writeFileSync(file, "\uFEFF" + [COLS.join(","), ...items.map((it) => COLS.map((c) => cell(it[c])).join(","))].join("\r\n") + "\r\n");
}
const normUrl = (u) => String(u).split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();

const items = load();
switch (cmd) {
  case "add": {
    if (!opts.id) { console.error("add needs --id"); process.exit(2); }
    if (items.some((x) => x.id === opts.id || (opts.url && normUrl(x.url) === normUrl(opts.url)))) {
      console.log(`exists: ${opts.id}`); break;
    }
    const it = Object.fromEntries(COLS.map((c) => [c, opts[c] ?? ""]));
    it.date_found ||= today; it.status ||= "found";
    items.push(it); save(items); console.log(`added: ${it.id}`); break;
  }
  case "update": {
    const it = items.find((x) => x.id === pos[0]);
    if (!it) { console.error(`not found: ${pos[0]}`); process.exit(1); }
    for (const [k, v] of Object.entries(opts)) if (COLS.includes(k)) it[k] = v;
    if (opts.status === "applied" && !opts.date_applied) it.date_applied = today;
    save(items); console.log(`updated: ${it.id} -> ${it.status}`); break;
  }
  case "seen": {
    const q = pos[0] || "";
    console.log(items.some((x) => x.id === q || normUrl(x.url) === normUrl(q)) ? "yes" : "no"); break;
  }
  case "list": {
    const list = opts.status ? items.filter((x) => x.status === opts.status) : items;
    const counts = {};
    for (const x of items) counts[x.status] = (counts[x.status] || 0) + 1;
    console.log(`${items.length} jobs tracked: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`);
    for (const x of list) console.log([x.status, x.score || "-", x.id, x.title, x.company, x.location, x.apply_type, x.date_applied].join(" | "));
    break;
  }
  default:
    console.error("Commands: add | update <id> | seen <url-or-id> | list"); process.exit(2);
}
