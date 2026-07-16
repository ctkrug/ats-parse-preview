# Backlog

Epics and stories for v1. All start unchecked. Every story has 1–3 verifiable acceptance
criteria — concrete checks, not vibes.

## Epic 1: Core parse & the wow moment

The split view — original layout next to the raw text stream an ATS would ingest — is the
demo. It ships before anything else.

- [ ] **Upload a PDF and see the wow-moment split view**
  - Dropping a single-column, single-page PDF renders the original page via pdf.js canvas on
    one side and the raw extracted text stream on the other, with no console errors.
  - The scan-line sweep animation (per `docs/DESIGN.md`) plays once on successful parse.

- [ ] **Detect and highlight multi-column layout scrambling**
  - For a fixture PDF with a genuine 2-column layout, the extracted text interleaves the
    columns in pdf.js's native read order (reproducing the ATS misread) rather than the
    correct per-column reading order.
  - The offending column region is drawn as a highlighted bounding box on the original render.

- [ ] **Detect table cell reordering**
  - For a fixture PDF containing a table, the extracted text shows cell content concatenated
    out of visual row/column order.
  - The table's bounding region is highlighted on the original render with a warning message
    naming it as a table.

- [ ] **Design polish pass for the parse view**
  - Split view matches `docs/DESIGN.md` tokens (blueprint navy/cyan/amber, JetBrains
    Mono + Inter) at 390px, 768px, and 1440px with no horizontal scroll or overlap.

## Epic 2: DOCX support & structural warnings

- [ ] **Support .docx upload via mammoth.js**
  - Dropping a `.docx` file renders its extracted plain text using the existing
    `extractFromDocx` parser.
  - Dropping an unsupported file type (e.g. `.png`, `.txt`) shows an inline error message, not
    a crash or blank screen.

- [ ] **Warn on floating text boxes**
  - For a fixture document containing a text box, the tool surfaces a warning: "Content in a
    text box may be skipped by ATS parsers," with the box's region highlighted.

- [ ] **Warn on image-only text**
  - For a fixture document containing a scanned/rasterized text region with no extractable text
    layer, the tool surfaces a warning that the region produced zero extractable characters.

- [ ] **Warnings rail with plain-language explanations**
  - Each warning entry shows a one-line explanation of *why* it matters to an ATS, not just a
    label — e.g. "Tables are often read cell-by-cell out of order, scrambling job titles and
    dates."
  - Clicking a warning scrolls/highlights its region in the document render.

- [ ] **Design polish pass for the warnings rail**
  - Warnings rail matches `docs/DESIGN.md` tokens and collapses sensibly into the stacked
    mobile layout at 390px.

## Epic 3: Usability, robustness, and ship polish

- [ ] **Drag-and-drop + file picker with validation**
  - Dragging a file over the drop zone shows a themed hover/active affordance (per
    `docs/DESIGN.md`), not a bare browser default.
  - Dropping an oversized (>10MB) or unsupported file shows an inline error naming the reason,
    without attempting to parse it.

- [ ] **Copy raw extracted text to clipboard**
  - Clicking "Copy text" copies exactly the text shown in the stream panel, verified by a unit
    test comparing clipboard content to the rendered string.

- [ ] **Privacy messaging is explicit and checkable**
  - The page states plainly that the resume never leaves the browser.
  - Opening browser devtools and parsing a file shows zero outgoing network requests carrying
    file content (manually verified in QA).

- [ ] **Landing/marketing site matches the app's design system**
  - `site/` is a static page built from the same tokens in `docs/DESIGN.md` (same fonts,
    palette, and wordmark) so product and marketing page read as one brand.
  - Links to the live app; builds to a single self-contained directory with relative asset
    paths.

- [ ] **Mobile responsive layout end-to-end**
  - Full upload-to-warnings flow works at 390px width with no horizontal scroll and touch
    targets ≥44px.
