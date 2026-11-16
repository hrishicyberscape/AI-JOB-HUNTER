# AI Job Hunter: agent instructions

This repository is a job-search skill. Any coding agent (Claude Code, Gemini CLI,
OpenAI Codex CLI, ...) running in this folder can use it.

## When the user wants anything job-search related
Examples: "find me jobs", "apply to project manager roles in Dubai", "tailor my resume
for this JD", "what's my ATS score", "status of my applications", "set me up".

**Read `skills/job-hunter/SKILL.md` and follow it.** It describes the full workflow,
the scripts, and the rules. The most important rules, repeated here because they protect
the user:

1. Never submit an application without the user approving that specific job in chat.
2. Never invent skills, certifications, numbers or experience. Resumes are tailored only
   from `profile/master_resume.json`.
3. Never type passwords or solve captchas. The user signs in and handles verification
   in the browser window.
4. Keep personal data in `profile/` and `job-search/` (both git-ignored). Never commit
   or upload them anywhere except the application being submitted.

If `profile/profile.md` or `profile/master_resume.json` doesn't exist yet, start with
onboarding: `skills/job-hunter/references/onboarding.md`.

## Working on the repo itself
- Scripts are plain Node.js (18+) ES modules with no dependencies. Keep it that way so
  users don't need `npm install`.
- Run `npm test` after changing anything in `skills/job-hunter/scripts/`.
- Keyword packs live in `skills/job-hunter/keywords/<field>.json` as `[term, weight, ...aliases]`,
  with a `!` prefix on certification names.
- Never commit anything from `profile/` except the `*.example.*` templates.
