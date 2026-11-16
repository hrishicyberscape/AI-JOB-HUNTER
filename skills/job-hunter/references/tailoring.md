# Tailoring a resume to a job description

Input: `profile/master_resume.json` + `job-search/jobs/<id>/jd.txt`.
Output: `job-search/jobs/<id>/resume.json`, the same shape as the master minus `_note`
and `bullet_bank`.

## Decide the angle first
Read the JD and pick the one or two things the employer cares about most (e.g.
"delivery of client web projects with Agile", or "QA leadership with automation").
Every edit below should push that angle forward. A focused resume beats one that
mentions everything.

## Edit each section
- **headline:** the JD's title if it truthfully describes the user (e.g. "Technical
  Project Manager" for a project manager with a technical background). Otherwise
  keep the user's own title.
- **summary:** 3–4 lines. Open with the JD's title and the user's years of
  experience, then mirror the JD's top 4–6 requirements in its own wording, where
  the user genuinely has them. Close with one standout true result.
- **competencies:** 10–14 items. List first the ones the JD names, phrased the way the
  JD phrases them (e.g. "Stakeholder Management" rather than "Client relations"
  if the JD says that). Drop ones irrelevant to this job.
- **experience:** keep every job, title and date as it is. For each job, choose and
  order bullets from `bullets` + `bullet_bank` so the most relevant come first.
  Light rewording toward JD terms is fine. Numbers, scope and facts stay exactly
  as written. About 3–5 bullets for recent jobs, 1–3 for older ones.
- **tools:** reorder so the tools the JD names come first. Remove nothing true that
  the JD asks for.
- **education, certifications, languages:** unchanged.

## Score and iterate
Run `ats_score.mjs` and read its output:
- `Missing but TRUE (in master)`: work these in (summary, competencies, bullets).
- `Missing and NOT in master, do not add`: leave them out. They are the honest gap.
- `Other JD terms not in master`: tools or terms detected automatically. Add one only
  if the master resume (or the user, when asked) confirms it.
- `Title words missing`: adjust the headline or summary if truthful.
- `UNVERIFIED`: a term in the tailored resume that isn't in the master. Remove it,
  or replace it with the master's wording. The only exception is pure synonyms of
  master content (e.g. JD says "stakeholder communication" and the master says
  "stakeholder management").
- `FLAG`: a possible deal-breaker (language, certification, work authorisation).
  Mention it in the shortlist.

Stop after 3 rounds. Missing keywords the user doesn't have are information about fit,
not something to fix.

## Length and format
Keep it to one page for under 10 years of experience, two at most. The PDF builder
handles ATS-safe formatting (single column, standard headings, real text). Don't add
tables, columns, icons or photos.

## Example (what "honest mirroring" looks like)
JD: "...experience managing **client stakeholders** and **release planning** for
**SaaS** products..."

Master bullet: "Coordinate 2-4 production releases per month, managing QA readiness
and stakeholder communication."

- Good: "Lead release planning for 2-4 production releases per month, managing QA
  readiness and client stakeholder communication." The same facts, in the JD's words.
- Bad: "...for 5 SaaS products". This changes a fact and adds "SaaS", which the
  master doesn't support.
