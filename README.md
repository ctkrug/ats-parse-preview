# Readout

**▶ Live demo — [apps.charliekrug.com/ats-parse-preview](https://apps.charliekrug.com/ats-parse-preview/)**

[![CI](https://github.com/ctkrug/ats-parse-preview/actions/workflows/ci.yml/badge.svg)](https://github.com/ctkrug/ats-parse-preview/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-3fd0f0.svg)](LICENSE)

See what an ATS reads. No email.

Drop a resume in and Readout shows you the exact plain text an applicant tracking system pulls
out of your file, next to your original layout, with the regions it scrambles boxed in amber.
It runs entirely in your browser: no account, no upload, no score out of 100.

## Who it's for

Someone a few dozen applications into a job search who has heard nothing back and is starting
to suspect the tidy two-column template, not the experience. Every other checker trades a
number out of 100 for an email address. This one hands over the raw text and the reasons.

## The output

A two-column resume, with a skills sidebar on the left and experience on the right, looks like
this on the page. Here is what the parser actually gets, taken verbatim from the project's own
test fixture:

```
CHARLIE KRUG
SKILLS EXPERIENCE
TypeScript Senior Engineer, Acme Corp
Go 2019 - 2024, Berlin
Kubernetes Led the platform team
Postgres Cut deploy time by 80%
```

```
[multi-column] Columns are read across, not down
  Your columns look separate to the eye, but the parser jumps between them line by
  line, so text from one column lands in the middle of the other. Job titles end up
  next to a neighbouring column's dates.
```

"Go" is now a year of employment in Berlin. A keyword matcher reading that stream does not see
a Go engineer who led a platform team, and no amount of rewording fixes it, because the problem
is the file rather than the words.

## What it catches

- **Columns read across instead of down.** Readout counts how often the parse order hops
  between your columns. Reading two columns properly takes exactly one hop. A file that
  scrambles hops on nearly every line, and both columns get boxed on your render.
- **Tables that scramble their rows.** Aligned cell grids are detected, and cells emitted down
  the columns instead of across the rows are called out with the region marked.
- **Pages with no text layer.** A resume exported as an image looks perfect and parses to
  nothing. You get told in a sentence rather than shown an empty panel.
- **Nothing else.** A layout the parser happens to read correctly raises no warning at all. The
  point is an honest reading, not a scary count.

Each warning explains why it matters to a parser in plain language, and clicking it jumps to
the exact region of your own document that caused it.

## Why there is no score

There are hundreds of ATS vendors and each parses a little differently, so a single number
implies a precision nobody has. Raw text is falsifiable: you can read it and check whether your
job title survived. A score cannot be checked at all, which is what makes it good lead-gen and
bad information.

## Privacy

`pdf.js` and `mammoth.js` run in the browser, so the file never leaves the machine. There is no
upload endpoint in this product because there is no server in this product. Open the network
tab, drop a resume, and watch nothing fire. It also works with the wifi off, which is the
fastest way to check the claim instead of believing it.

## Develop

```bash
npm install
npm run dev        # dev server on localhost:5173
npm test           # vitest: pure logic + real pdf.js and mammoth integration
npm run typecheck  # tsc --noEmit
npm run build      # -> dist/, a self-contained static site
npm run preview    # serve the build
```

`npm run build` emits `dist/` with relative asset paths, so it can be served from a subpath or
opened from a file system. There is nothing to configure and nothing to deploy but the files.

## How it works

An ATS reads a resume as one linear stream of text, in the order the file's content stream
emits it, not the order your eye reads the page. Readout extracts that exact stream through the
same libraries those pipelines use, keeps every word's position on the page, and compares the
two.

The interesting part is that a two-column layout is not itself the bug. The same layout is fine
if the file writes the left column out in full before starting the right one. What breaks is
emission order, so the detector measures line crossings between column bounds rather than
guessing from the look of the page. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) maps the
modules and the data flow, and [`docs/VISION.md`](docs/VISION.md) covers why it refuses to
grade you.

## Stack

- **TypeScript** and **Vite**, no framework.
- **[pdf.js](https://mozilla.github.io/pdf.js/)** for PDF rendering and text-run extraction.
- **[mammoth.js](https://github.com/mwilliamson/mammoth.js)** for DOCX conversion.
- **Vitest**, including integration tests that drive real pdf.js and mammoth over hand-built
  fixture bytes rather than mocks.
- No backend, no database, no analytics.

## Status

Working: PDF and DOCX parsing, column-scramble and table detection, the split view with clickable
region highlights, and the parse explainer. Floating text-box warnings and sub-page image
regions for PDFs are still to come, tracked in [`docs/BACKLOG.md`](docs/BACKLOG.md).

## License

MIT, see [`LICENSE`](LICENSE).

More of Charlie's projects → https://apps.charliekrug.com
