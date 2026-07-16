# Architecture

A map of the codebase for anyone (human or agent) picking this up cold.

## The idea in one paragraph

An ATS ingests a resume as a **linear stream of text**, in the order the file's content stream
emits it — not in the order a human reads the page. When a layout puts two columns side by
side and the generator emits them row by row, the parser reads *across* the columns, and your
job titles land next to the neighbouring column's dates. This tool extracts that exact stream,
detects where the layout and the stream disagree, and draws the damage on your own document.
Everything runs in the browser; no file ever leaves it.

## Layout

```
src/
  main.ts               # app shell markup + state wiring (empty / busy / error / result)
  style.css             # the whole blueprint theme; tokens mirror docs/DESIGN.md
  parsers/
    index.ts            # parseFile(): the one door in — validate, dispatch, normalize errors
    types.ts            # Rect, TextRun, PageContent, ParseWarning, ExtractedDocument
    pdf.ts              # pdf.js extraction; flips PDF coords to top-left, keeps stream order
    docx.ts             # mammoth extraction: raw text + HTML preview
  lib/                  # pure logic — no DOM, no pdf.js; this is where the tests live
    geometry.ts         # rect math (union, pad, intersects, overlap1d)
    lines.ts            # group positioned runs into visual lines
    columns.ts          # detect side-by-side columns via whitespace gutters
    readingOrder.ts     # native (parser) order vs human order; interleaving measure
    tables.ts           # detect table regions from aligned row-like lines
    analyze.ts          # detectors -> ParseWarnings (the orchestrator of lib/)
    docxAnalysis.ts     # DOCX warnings from converted markup
    fileValidation.ts   # type/size checks at the input boundary
    parseErrors.ts      # ParseError + failure -> actionable message
    textStats.ts        # word/char/line counts for the stats strip
  ui/                   # DOM views; each owns one panel and takes a callback
    dropZone.ts         # drag-and-drop + file picker
    documentView.ts     # canvas render + highlight regions + scan sweep
    textStream.ts       # raw stream panel, counts, copy
    warningsRail.ts     # warning list with explanations
tests/                  # vitest; mirrors src/lib plus a real-pdf.js integration suite
  fixtures/pdfFixture.ts  # hand-written PDF builder (pins content-stream order)
  setup.ts              # Promise.withResolvers polyfill for pdf.js under Node
```

## Data flow

```
File
 └─ parsers/index.ts  validateFile() ─ reject ─> ParseError ─> status bar
     └─ pdf.ts / docx.ts
         ├─ TextRun[] per page (x, y, w, h, str, order)   order = content-stream index
         ├─ lib/analyze.ts
         │   ├─ detectTables()   ── tables claim their runs first
         │   ├─ detectColumns()  ── on the runs the tables did not claim
         │   ├─ measureInterleaving()  ── native order vs column order
         │   └─ ParseWarning[] { kind, title, explanation, pageNumber, regions }
         └─ extractedText()  ── the stream, in native order
 └─ main.ts ─> documentView.show(preview, warnings)   canvas + region boxes
             ─> textStream.show(text)                 raw stream + counts
             ─> warningsRail.show(warnings)           explanations, cross-linked
```

## The load-bearing decisions

- **`TextRun.order` is the whole point.** It is the index the document emitted the run at.
  Everything else can be re-derived from geometry; that order cannot, and it is what an ATS
  actually consumes. Never "helpfully" sort runs on extraction.
- **Coordinates are top-left, in PDF points.** `pdf.ts` flips pdf.js's bottom-left origin once,
  at the boundary, so no detector or view has to think about it again.
- **A gutter is defined by line crossings, not run width.** A resume's name banner spans the
  columns but is only ~40% of the page wide, so a width rule misses it and the header bridges
  the gutter, hiding the columns. `columns.ts` instead finds the widest interior band that at
  most a quarter of the page's lines cross. (Learned the hard way — see the fixture tests.)
- **Tables claim their runs before column detection.** A table's cell columns have the same
  whitespace-gutter shape as page columns; without this, every table double-reports.
- **We warn only when the parse actually breaks.** Columns that a parser happens to read in
  order raise nothing. The tool's value is honesty, not a scary count.
- **`lib/` never imports the DOM or pdf.js.** That is what makes the detectors testable, and
  it is why the test suite is fast and real rather than mocked.

## Running it

```
npm run dev        # vite dev server
npm test           # vitest: pure logic + real-pdf.js integration
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + vite build -> dist/ (relative paths, subpath-safe)
npm run preview    # serve dist/
```

## Testing approach

`tests/` mirrors `src/lib` one file per module, covering happy path and boundaries (empty,
single, malformed, off-by-one). `tests/pdfIntegration.test.ts` runs the real pdf.js over
fixture PDFs whose bytes are written by hand in `tests/fixtures/pdfFixture.ts` — a generic PDF
library hides content-stream order, which is exactly the variable under test. That suite is
what caught the width-based gutter bug the synthetic unit tests could not.
