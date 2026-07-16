# ATS Parse Preview

See exactly what an ATS sees when it reads your resume — no login, no upload, no vague score.

## What it is

Drop in a resume (PDF or DOCX) and watch it decompose into the raw text stream an Applicant
Tracking System would actually extract. Columns that look clean, tables that look organized,
and text boxes that look fine on the page often collapse into scrambled word-salad the moment
a parser reads them top-to-bottom, left-to-right. ATS Parse Preview shows you that exact
mangled output side-by-side with your original layout, with the offending regions highlighted
directly on the page.

## Why

Every existing "resume checker" gates its results behind an email signup and reduces the
problem to an opaque score out of 100. That's a lead-gen funnel wearing a helpfulness costume.
It also doesn't teach you anything: a number doesn't tell you *why* your resume failed, or
which section is the culprit.

ATS Parse Preview does the opposite:

- **100% client-side.** Your resume is parsed entirely in your browser with `pdf.js` and
  `mammoth.js`. It never touches a server, because there is no server to send it to.
- **No signup, no email, no score.** Just the raw extracted text and a list of concrete
  structural warnings ("this table will be read out of order," "text in this box may be
  skipped entirely").
- **Show the work.** The diff view *is* the product — you see precisely what an ATS ingests,
  not a black-box verdict.

## Planned features

- Drag-and-drop upload for PDF and DOCX resumes.
- Side-by-side view: original rendered layout vs. raw extracted text stream.
- Highlighted regions on the original document flagging multi-column reflow issues, table
  cell reordering, floating text boxes, and image-only text.
- Plain-language explanations for every warning — what it means and why an ATS trips on it.
- Copy-to-clipboard for the exact extracted text.

## Stack

- **TypeScript** + **Vite** for the build.
- **[pdf.js](https://mozilla.github.io/pdf.js/)** for PDF rendering and text-run extraction.
- **[mammoth.js](https://github.com/mwilliamson/mammoth.js)** for DOCX-to-text conversion.
- **Vitest** for tests.
- No backend, no database, no analytics.

## Status

Early scaffold — see [`docs/VISION.md`](docs/VISION.md) and [`docs/BACKLOG.md`](docs/BACKLOG.md)
for the plan.

## License

MIT — see [`LICENSE`](LICENSE).
