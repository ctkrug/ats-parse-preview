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

## How it works

An ATS reads a resume as one linear stream of text, in the order the file's content stream
emits it — not the order your eye reads the page. When a two-column layout is emitted row by
row, the parser reads *across* the columns, and your job titles land beside the neighbouring
column's dates.

So the tool extracts that exact stream, keeps every word's position on the page, and compares
the two:

- **Columns read across, not down.** It counts how often the parse order hops between your
  columns. Reading two columns properly takes exactly one switch; a scrambling file switches on
  nearly every line. Both columns get highlighted when that happens.
- **Tables that scramble their rows.** Aligned cell grids are detected, and cells emitted down
  the columns instead of across the rows are called out.
- **Pages with no text layer.** An exported-as-image resume looks perfect and parses to
  nothing. You get told, plainly.

It only warns when the parse actually breaks. Columns that a parser happens to read in order
raise nothing — the value here is honesty, not a scary count.

## Features

- Drag-and-drop or pick a PDF or DOCX (10 MB cap, validated before parsing).
- Split view: your rendered document beside the raw stream, warnings cross-linked to the
  highlighted regions on your own layout.
- Plain-language explanation of *why* each warning matters to a parser.
- Copy the exact extracted text to the clipboard.
- Designed empty, loading, error, and success states — a password-protected or damaged file
  gets a sentence you can act on, never a blank screen.

## Develop

```bash
npm install
npm run dev        # dev server
npm test           # vitest: pure logic + real-pdf.js integration
npm run typecheck  # tsc --noEmit
npm run build      # -> dist/ (app at the root, landing page in dist/site)
npm run preview    # serve the build
```

The build is static and every path is relative, so `dist/` can be served from a subpath.
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) maps the modules and the data flow.

## Stack

- **TypeScript** + **Vite** for the build.
- **[pdf.js](https://mozilla.github.io/pdf.js/)** for PDF rendering and text-run extraction.
- **[mammoth.js](https://github.com/mwilliamson/mammoth.js)** for DOCX-to-text conversion.
- **Vitest** for tests.
- No backend, no database, no analytics.

## Status

Working: PDF and DOCX parsing, column-scramble and table detection, the split view with
highlighted regions, and the landing page. Text-box and image-only warnings for PDFs are still
to come — see [`docs/BACKLOG.md`](docs/BACKLOG.md), with the rationale in
[`docs/VISION.md`](docs/VISION.md).

## License

MIT — see [`LICENSE`](LICENSE).
