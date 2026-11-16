# Onboarding a new user

Goal: create `profile/profile.md`, `profile/master_resume.json` and `profile/settings.json`
from the user's resume and a short interview. Do this once. Later runs only update these files.

## 1. Get the resume
Ask the user for their current resume (PDF, DOCX or pasted text). If they have
several versions, take all of them. Different versions often carry different true
details (metrics, tools, wording), and the master resume should hold the union.

Read the file with whatever your agent supports. Agents that can't read PDFs
natively can usually extract the text with a shell tool (`pdftotext`, or open it in
the browser and read the page text).

## 2. Build `profile/master_resume.json`
Copy the shape of `profile/master_resume.example.json`:
- Keep every fact exactly as the resume states it: dates, employers, numbers, titles.
- Put the best 3–5 bullets per job in `bullets` and any other true variants in `bullet_bank`.
- Put every tool, method and domain the user has really used into `tools`. The truth
  check compares tailored resumes against this file, so anything missing here is
  later treated as made up.
- Don't add skills the resume doesn't support. If you think the user probably has
  one (e.g. Scrum when they mention Agile and sprints), **ask** rather than assume.

## 3. Spot problems recruiters will notice, and ask about them
Look for, and ask the user to explain:
- Overlapping jobs or gaps of more than about 6 months
- Degree dates that are inconsistent between versions, or that fall after the experience
- Missing months on dates, unclear titles, metrics without context
- Contact details that differ between versions

Record the answers in `profile.md` (under "Experience facts"), so form questions get
consistent, honest answers. Never "fix" a date to hide an overlap or gap.

## 4. Interview for `profile/profile.md`
Copy `profile/profile.example.md` and fill it in. Ask in one or two batches, not one
question at a time:
- Target titles, countries/cities, remote preference, seniority
- Notice period / availability, current and expected salary per market
- Work authorisation for each target country (needs sponsorship?), willingness to relocate
- Which job sites they have accounts on and are signed in to
- Anything to avoid (companies, industries)

Personal identifiers (date of birth, passport, ID numbers, gender, marital status,
religion) stay as `ASK` unless the user explicitly wants them pre-filled.

Gently point out expectations that may hurt results, e.g. a salary jump far above
typical raises, or a region where the user's work authorisation is a common
blocker. Then respect the user's decision.

## 5. Choose keyword packs: `profile/settings.json`
Copy `profile/settings.example.json`. Set `keyword_packs` from the files in
`<skill>/keywords/` (without `.json`) that fit the target roles. Usually one or two:

| Target roles | Packs |
|---|---|
| Project / program / delivery manager, Scrum master | `project-management` (+ `qa-testing` if the user has a QA background) |
| QA / test engineer, SDET | `qa-testing` |
| Software / web / backend / frontend developer | `software-engineering` |
| Data / BI / business analyst | `data-analytics` |
| Product manager / owner | `product-management` |

`common` is always loaded. No pack fits? Create `<skill>/keywords/<field>.json` in the
same format: `[term, weight 1-3, ...aliases]`, with a `!` prefix on certification
names. Commit it so other users benefit.

## 6. Verify
Run `node <skill>/scripts/check_setup.mjs` until it says **Ready**. Then show the
user a short summary of their profile and ask them to correct anything wrong
before the first search.
