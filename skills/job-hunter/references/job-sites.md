# Job sites: searching and applying

Search only the sites the user lists in `profile.md`. Layouts and URL formats change.
If a pattern below stops working, use the site's own search box, and update this file
(and open a pull request) so everyone benefits.

Rotate through the user's main target titles first. Use the secondary titles only if
results are thin. Use "past week" or the nearest date filter, sorted newest first.

## LinkedIn (global)
- Search: `https://www.linkedin.com/jobs/search/?keywords=<title>&location=<place>&f_TPR=r604800&sortBy=DD`
  - `f_TPR=r604800` = past week. `sortBy=DD` = newest first.
  - `&f_AL=true` = Easy Apply only. `&f_WT=2` = remote.
  - `location` takes a country or city name, e.g. `India`, `United Arab Emirates`, `Germany`, `London`.
- Click a result to load its description, then read the page text.
- **Easy Apply** = quick. **Apply** with an external-link icon = external.
- Easy Apply flow: contact info → resume upload (pick the tailored PDF, not an older
  upload) → screening questions → review → Submit.
- LinkedIn is the strictest about automation. Keep to about 10–12 Easy Apply
  submissions per run, with pauses between them. Stop LinkedIn for the run if it shows
  an Easy Apply limit or an "unusual activity" warning.

## Indeed (one site per country)
- Search: `https://<cc>.indeed.com/jobs?q=<title>&l=<city or blank>&fromage=7&sort=date`
  - `<cc>` examples: `in` (India), `ae` (UAE), `sa` (Saudi Arabia), `qa`, `kw`, `om`,
    `bh`, `uk`, `ca`, `au`, `de`, `sg`. The US is `www.indeed.com`.
- **Easily apply** = quick (Indeed's own form). **Apply on company site** = external.
- Indeed may offer the profile resume first. Choose to upload a different resume and
  attach the tailored PDF.
- Indeed shows "verify you are human" checks fairly often. Hand those to the user.

## Naukri (India)
- Search: `https://www.naukri.com/<title-with-hyphens>-jobs?experience=<years>&jobAge=7`
  - With a city: `https://www.naukri.com/<title>-jobs-in-<city>?experience=<years>&jobAge=7`
- **Apply** = quick, but it sends the resume **saved in the Naukri profile**, not a
  per-job file. **Apply on company site** = external.
- Don't replace the user's Naukri profile resume without asking. That changes it for
  every application and every recruiter search.
- Extra questions usually cover current CTC, expected CTC (in lakhs), and notice period.

## Naukrigulf, Bayt, GulfTalent (Gulf / Middle East)
- These are separate accounts. Use them only if the user lists them.
- **Naukrigulf:** `https://www.naukrigulf.com/<title-with-hyphens>-jobs` (has location and freshness filters).
- **Bayt:** `https://www.bayt.com/en/<country>/jobs/<title-with-hyphens>-jobs/` (e.g.
  `uae`, `saudi-arabia`, `qatar`). Look for "Easy Apply" vs external.
- **GulfTalent:** use the site's search box. Most applications go through its own form.
- Many Gulf postings restrict nationality (Emiratisation, Saudisation, "nationals
  only") or require a transferable visa. Screen against the user's work authorisation.

## Glassdoor, Foundit (Monster), and others
- Use the site's search box with the same titles, locations and date filters.
- Treat any flow that leaves the site as external.

## Recognising problems
| You see | Do |
|---|---|
| Login page, OTP / verification code, captcha, "verify you are human" | Stop and ask the user to handle it in the browser window |
| "No longer accepting applications" / closed | `tracker.mjs update <id> --status closed` |
| Paid "premium" or "boost your application" prompts | Decline / skip. Never pay or start a trial |
| Request for documents (passport copy, ID) | Stop and ask the user |
| Redirect to another domain mid-apply | Treat as external: add to `apply-yourself.md` |
