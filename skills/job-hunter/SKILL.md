---
name: job-hunter
description: End-to-end job-search assistant. Searches job sites (LinkedIn, Indeed, Naukri, Bayt, Glassdoor and others) in the user's own signed-in browser for roles that match their profile, tailors an ATS-friendly resume to each job description using only their real experience (target ATS match score 85+), builds the PDFs, and, after the user approves a shortlist, submits quick-apply applications. Jobs that redirect to company career sites are listed with a ready resume for the user to submit. Also handles first-time onboarding (turning the user's resume into a profile). Use whenever the user mentions job hunting, finding openings, applying for jobs, tailoring or optimising a resume for a job description, ATS scores, LinkedIn Easy Apply / Indeed / Naukri applications, or checking the status of their applications, even if they don't name this skill.
---

# Job Hunter

Run a job-hunting cycle for the user: **search → screen → tailor → score → user
approves → apply → track.** Each run continues from the last one through the tracker.

This skill works with any agent that can run shell commands and control a browser:
Claude Code, Gemini CLI, OpenAI Codex CLI and others. Wherever it says "the browser
tool", use whichever browser tool your agent has (see `references/browser-setup.md`).

## Where things are

All paths are relative to the repo root (the current directory, or `$JOB_HUNTER_HOME`).
`<skill>` = the folder containing this file (normally `skills/job-hunter`).

| Path | What |
|---|---|
| `profile/profile.md` | Facts, salary expectations, work authorisation, standard form answers. **Private.** |
| `profile/master_resume.json` | The only source of resume content. Every fact in it is true. **Private.** |
| `profile/settings.json` | Keyword packs, score thresholds, per-run application limit. |
| `job-search/tracker.csv` | Every job ever seen and its status (opens in Excel / Sheets). |
| `job-search/jobs/<job-id>/` | `jd.txt`, `resume.json`, `score.json`, the tailored PDF. |
| `job-search/apply-yourself.md` | Jobs the user submits on company websites. |
| `<skill>/references/` | `onboarding.md`, `job-sites.md`, `browser-setup.md`, `tailoring.md` |
| `<skill>/scripts/` | Node.js scripts (no npm install needed) |

Scripts (run with `node <skill>/scripts/<name>.mjs`):
- `check_setup.mjs`: is everything ready? Run it first, every time.
- `ats_score.mjs --resume <json> --jd <txt> --out <score.json>`: scores a resume against a JD and checks for claims not in the master resume.
- `build_resume.mjs <resume.json> <out.pdf>`: renders a clean single-column PDF.
- `tracker.mjs add|update|seen|list`: the tracker.

`<job-id>` = `<site>-<company>-<short-title>`, lowercase-with-hyphens, plus the site's
job number if there is one, so it stays unique.

## Ground rules, and why

1. **Only true content.** Tailoring means choosing, ordering and rephrasing the
   user's real experience in the job description's vocabulary. It never means
   adding a skill, tool, certification, metric or responsibility they don't have.
   Invented keywords may get past the software, but they fail at interview or
   background check, and they can cost the user an offer later. `ats_score.mjs`
   lists `unverified` terms. Treat each as a bug, unless it's just the JD's wording
   for something the master resume clearly says.
2. **The pass score (default 85) is a filter, not a number to force.** If an honest
   resume can't reach it, the job wants things the user doesn't have. Mark it
   `low-match` and move on. Show near misses (default 78–84) separately so the user
   can choose.
3. **Nothing is submitted without the user's approval in chat.** An application
   sends personal data to an employer and can't be recalled. Present the
   shortlist, wait for the user's reply ("apply 1, 3, 5-8"), and submit exactly
   those. Approval covers only the jobs named in that reply, in that run.
4. **The user handles sign-ins, passwords, verification codes and captchas.** Never
   type a password and never try to solve a captcha. When one appears, pause and
   ask the user to deal with it in the browser window, then continue.
5. **Human pace.** Stay within `max_applications_per_run` (default 20), pause
   between applications, and avoid rapid-fire page loads. Job sites restrict
   accounts that behave like bots.
6. **Unknown question → ask, never guess.** Answer forms only from `profile.md`.
   Collect every question you can't answer (anything marked ASK, essay questions,
   personal IDs) and ask the user in one message. Save reusable answers back into
   `profile.md` once the user gives them.
7. **Personal data stays local.** `profile/` and `job-search/` are git-ignored.
   Don't paste their contents into web searches, URLs or any site other than the
   application being submitted.

## Workflow

### 0. First run? Onboard.
Run `node <skill>/scripts/check_setup.mjs`. If it reports a missing or incomplete
profile, follow `references/onboarding.md` before anything else, then re-run the check.

### 1. Start up
- Read `profile/profile.md`, `profile/settings.json` and `references/job-sites.md`.
- Run `node <skill>/scripts/tracker.mjs list`. Note any `approved` jobs not yet submitted.
- Work out time-dependent answers from today's date, such as how many notice-period days are left.
- Unless the user said otherwise this run, use the defaults: all target titles and
  locations in the profile, jobs posted in the last 7 days, and about 30 new postings.

### 2. Browser and sign-ins
Open each of the user's job sites in the browser tool (see `references/browser-setup.md`).
If a site shows a login page, ask the user to sign in in that window and continue
with the other sites meanwhile.

### 3. Search
For each site, follow `references/job-sites.md`. For each result:
- Skip it if `tracker.mjs seen <url>` prints `yes`.
- Open the posting and save `job-search/jobs/<job-id>/jd.txt`. Start the file with
  `Title:`, `Company:`, `Location:`, `URL:`, `Salary:` (if shown) and `Apply type:`
  lines, then a blank line, then the full description text.
- Apply type: **quick** (the site's own form: LinkedIn Easy Apply, Indeed "Easily
  apply", Naukri "Apply", Bayt "Easy Apply") or **external** (redirects to a
  company site or another applicant-tracking site).
- `tracker.mjs add --id <job-id> --site <site> --company "<c>" --title "<t>" --location "<l>" --url <url> --apply_type quick|external`

Prefer reading page text over screenshots. It's faster, cheaper and more accurate.

### 4. Screen
Mark as `skipped`, with the reason in `--notes`, before spending effort tailoring:
- The required work authorisation, nationality or location excludes the user (compare with `profile.md`)
- A mandatory language or certification the user doesn't have ("preferred" is fine)
- Seniority clearly off: far more years required than the user has, or far too junior
- A stated salary below the user's floor
- Not actually the target kind of role
- Anything on the user's avoid list

### 5. Tailor and score
For each remaining job, follow `references/tailoring.md`. In short:
1. Write `job-search/jobs/<id>/resume.json`, a tailored copy of the master resume.
2. `node <skill>/scripts/ats_score.mjs --resume job-search/jobs/<id>/resume.json --jd job-search/jobs/<id>/jd.txt --out job-search/jobs/<id>/score.json`
3. Improve and re-score, at most 3 rounds, using only true content. Fix every `unverified` term.
4. `tracker.mjs update <id> --score <n> --status tailored` (≥ pass score) or `--status low-match`.
5. For tailored jobs: `node <skill>/scripts/build_resume.mjs job-search/jobs/<id>/resume.json "job-search/jobs/<id>/<First>_<Last>_<Company>_<Role>.pdf"`, then
   `tracker.mjs update <id> --resume "<pdf path>"`.

### 6. Shortlist: stop here and wait for approval
Show one table, best score first:

| # | Score | Role | Company | Location | Site | Apply type | Salary (if listed) |

Below it, list the near misses, plus a one-line tally of what was skipped and why
(e.g. "9 skipped: 4 nationals-only, 3 need PMP, 2 too junior"). Mention any `FLAG`
lines from scoring. Then ask which to apply to, and **stop.** When the user
replies, mark those jobs `approved` in the tracker.

### 7. Apply to approved quick-apply jobs
One at a time:
1. Open the posting and start the site's own apply flow.
2. Upload that job's tailored PDF with the browser tool's file-upload action.
   Replace any resume the site pre-selects.
3. Fill each field from `profile.md`. If a required field can't be answered, leave
   that job, note the question, and move on.
4. On the review page, check the right resume is attached, then submit.
5. Confirm the site shows the application as sent, then run `tracker.mjs update <id> --status applied`.
6. If anything unexpected appears (login wall, captcha, payment or "premium" upsell,
   a redirect to another site), stop that job and report it.

Some sites (e.g. Naukri) send the resume stored in the user's site profile rather
than a per-job upload. Don't replace the user's stored profile resume without
asking: that changes every future application. Say which resume will go in the
shortlist.

### 8. External-site jobs: the user applies
For approved external jobs, and any quick-apply job that turned out to redirect,
append to `job-search/apply-yourself.md`:

```
## <Role> at <Company> (<Location>), score <n>
- Apply link: <url>
- Resume: job-search/jobs/<id>/<file>.pdf
- Ready answers: notice period, expected salary in local currency, work authorisation
- Cover note (3-4 sentences, only if the portal asks for one)
```

Then run `tracker.mjs update <id> --status apply-yourself`. Don't fill in company
career portals yourself. They usually need new accounts and long forms, which are
better left to the user.

### 9. Report
Finish with: found / skipped / tailored / applied counts, the `apply-yourself.md`
path, open questions for the user, and anything that went wrong.

## Other requests
- **"Status" / "how's my search going":** `tracker.mjs list`, then summarise by status.
- **Outcome reported** (interview, rejection, offer): `tracker.mjs update <id> --status interview|rejected|offer --notes "..."`.
- **"Tailor my resume for this JD"** (no search): run step 5 for that one JD and give the user the PDF.
- **New skill or achievement:** add it to `master_resume.json` (it must be true), so future tailoring can use it.
