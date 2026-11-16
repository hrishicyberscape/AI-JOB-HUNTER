# AI Job Hunter

An AI agent skill that runs your job search: it **finds** matching jobs on LinkedIn,
Indeed, Naukri and other sites, **tailors** an ATS-friendly resume to each job
description (from your real experience only), **scores** it, and **applies** to the
jobs you approve. Jobs that need a company-website application are listed with a ready
resume for you to submit.

Works with the AI assistant you already use:

| Assistant | Runs on | Sign in with |
|---|---|---|
| [Claude Code](https://docs.claude.com/en/docs/claude-code) | Anthropic Claude | Claude subscription or Anthropic API key |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | Google Gemini | Google account or Gemini API key |
| [Codex CLI](https://github.com/openai/codex) | OpenAI | ChatGPT plan or OpenAI API key |

The same skill file (`skills/job-hunter/SKILL.md`) drives all three.

---

## How it works

```
 onboarding (once)      every run
 ───────────────────    ─────────────────────────────────────────────────────────────
 your resume  ──▶ profile ──▶ search sites ──▶ screen ──▶ tailor + score ──▶ SHORTLIST
                                                                              │
                                                       you reply "apply 1,3,5" ▼
                                         tracker ◀── apply (quick-apply jobs)
                                                 ◀── apply-yourself.md (company sites)
```

1. **Onboarding:** the agent reads your resume, asks a few questions (target roles,
   locations, salary, notice period, work authorisation), and builds a private profile.
2. **Search:** in a real browser window where *you* signed in to your job sites.
3. **Screen:** drops jobs you can't take (nationality or visa restrictions, mandatory
   certifications you don't hold, wrong seniority, pay below your minimum).
4. **Tailor:** reorders and rewords your real experience in each job ad's language,
   then scores it. Only resumes at 85+ make the shortlist; near misses are listed separately.
5. **You approve:** nothing is sent until you pick the jobs.
6. **Apply and track:** quick-apply jobs are submitted. Company-site jobs go into
   `apply-yourself.md` with the resume and form answers ready. Everything is
   recorded in `tracker.csv`, which opens in Excel or Google Sheets.

## Safety by design

- **You approve every application.** The agent stops at the shortlist and waits.
- **No fabrication.** A truth check flags any skill in a tailored resume that isn't in
  your master resume. The agent removes it rather than send it.
- **No passwords.** You sign in and solve captchas yourself in the browser window.
  The agent never sees or types your passwords.
- **Your data stays on your machine.** `profile/`, `job-search/` and `.browser-profile/`
  are git-ignored and never leave your computer except in the applications you approve.
- **Human pace.** Per-run limits (20 by default, about 12 for LinkedIn) keep your accounts safe.

> Job sites' terms of service generally discourage automated activity. This tool keeps
> you in the loop and works slowly, but you are responsible for how you use it on your
> accounts.

## Quick start

**You need:** [Node.js 18+](https://nodejs.org), Google Chrome (or Edge or Chromium),
and one of the three assistants above.

```bash
git clone https://github.com/hrishicyberscape/AI-JOB-HUNTER.git
cd AI-JOB-HUNTER
npm run check        # shows what still needs setting up
```

Then start your assistant **inside this folder**:

| Assistant | Start it | Browser setup |
|---|---|---|
| Claude Code | `claude` | Uses `.mcp.json` (Playwright). Approve it when asked. Or use Claude in Chrome with `claude --chrome` |
| Gemini CLI | `gemini` | Uses `.gemini/settings.json` (Playwright), automatically |
| Codex CLI | `codex` | Run once: `codex mcp add playwright -- npx @playwright/mcp@latest --user-data-dir .browser-profile` |

And say:

> Set me up for job hunting. My resume is at C:\Users\me\Documents\resume.pdf

After onboarding:

> Find Software Project Manager jobs in UAE and India posted this week

> Tailor my resume for this job: <paste the job description>

> What's the status of my applications?

On the first search, a Chrome window opens. Sign in to your job sites there once, and
later runs reuse the session. More detail: [browser-setup.md](skills/job-hunter/references/browser-setup.md).

## What's in the repo

```
AGENTS.md / CLAUDE.md / GEMINI.md    entry points for each assistant (all point to the skill)
.claude/skills/job-hunter/           lets Claude Code discover the skill automatically
.mcp.json, .gemini/settings.json     browser (Playwright MCP) config
skills/job-hunter/
  SKILL.md                           the workflow and rules
  references/                        onboarding, tailoring, job sites, browser setup
  keywords/                          keyword packs per job family (used for scoring)
  scripts/                           Node.js tools, no dependencies
    check_setup.mjs                  is everything ready?
    ats_score.mjs                    resume vs job description: score + truth check
    build_resume.mjs                 resume JSON -> one-page ATS-friendly PDF
    tracker.mjs                      application tracker (CSV)
profile/*.example.*                  templates (your real profile/ files stay private)
tests/run.mjs                        npm test
```

Created when you use it (private, git-ignored):
```
profile/profile.md, master_resume.json, settings.json
job-search/tracker.csv, apply-yourself.md, jobs/<job>/{jd.txt, resume.json, score.json, *.pdf}
.browser-profile/
```

## About the ATS score

There's no single industry ATS score. Workday, Taleo, Greenhouse and Naukri each rank
differently. `ats_score.mjs` is a consistent, explainable stand-in:

| Part | Weight | Measures |
|---|---|---|
| Keywords | 65% | Coverage of the job ad's skills and tools (from keyword packs and auto-detected terms), weighted by importance and repetition |
| Title | 15% | The job title's words appear in your headline, summary or job titles |
| Experience | 10% | Your years versus the years asked for |
| Format | 10% | Contact details, summary, competencies, dated jobs, quantified results, length |

It also prints what's missing, what to add (only if true), and possible deal-breakers.

You can score any resume by hand:
```bash
npm run score -- --resume my_resume.json --jd job.txt
```

## Keyword packs

Pick packs in `profile/settings.json`: `project-management`, `qa-testing`,
`software-engineering`, `data-analytics`, `product-management` (`common` is always
loaded). For another field, add `skills/job-hunter/keywords/<field>.json`:

```json
[
  ["kubernetes", 2, "kubernetes", "k8s"],
  ["!cka", 2, "cka", "certified kubernetes administrator"]
]
```
Each entry is `[term, weight 1-3, ...aliases]`, and a `!` prefix marks a
certification. Pull requests with new packs are welcome.

## Development

```bash
npm test     # runs the script tests with the example profile (never touches yours)
```
The scripts are plain Node.js ES modules with no dependencies. Please keep it that
way, so users never need `npm install`.
