# Vision

## The problem

Applicant Tracking Systems parse resumes into plain text before a human ever sees them.
Multi-column layouts, tables, text boxes, and decorative headers — all things that look
completely normal on the page — routinely get scrambled or dropped entirely by these parsers.
A candidate can have a perfect resume and still get silently filtered out because a parser
read their two-column layout left-to-right-then-down instead of column-by-column, gluing their
job title to the wrong company.

The tools that exist to help are almost all lead-gen: upload your resume, hand over your email,
and receive a score out of 100 with no visibility into *why*. The score can't be verified, can't
be acted on precisely, and exists to capture your contact info for a recruiting funnel.

## Who it's for

Job seekers preparing a resume for an online application, and the career coaches / resume
writers who advise them. Anyone who has ever wondered "will this actually get read correctly?"
and had no way to check without submitting to an opaque system.

## The core idea

Run the same class of text-extraction pdf.js/mammoth.js use inside real ATS pipelines, entirely
in the browser, and show the *raw output* next to the *original layout* — not a score. Where the
two diverge (a table read out of cell-order, a floating text box skipped, a column reflowed into
nonsense) is highlighted directly on the original document, with a plain-language explanation of
why an ATS trips there.

The product is a diagnostic tool, not a grader. It tells you exactly what changed and where,
so you can fix the specific layout choice causing it — not just "add more keywords."

## Key design decisions

- **100% client-side, no exceptions.** No file upload endpoint exists in this product. This
  isn't just a privacy feature — it's the structural reason incumbents can't copy it without
  abandoning their email-capture business model.
- **No score.** A single number implies false precision about a space (hundreds of different
  ATS vendors, each with their own quirks) that can't be reduced to one metric honestly. Raw
  text + concrete warnings are falsifiable; a score is not.
- **Warnings are heuristic but verifiable.** Each warning is measured against a concrete
  document fixture during QA (real 2-column resume, real table, real text box) — not synthetic
  test strings — so a warning firing is evidence the underlying layout problem is real.
- **Highlight on the original, not just in a text diff.** Seeing the *region* of the document
  responsible for a warning is what makes the tool feel like an X-ray rather than a linter.

## What "v1 done" looks like

- Drop in a PDF or DOCX resume and see, within seconds: the rendered original, the raw
  extracted text stream, and a list of structural warnings with region highlights.
- At minimum, multi-column reflow, table cell reordering, and floating text boxes are detected
  against real fixture documents.
- Works entirely offline once loaded — no network requests during parsing, verifiable by
  watching the browser's network tab.
- Deployed as a static site, no backend, no account system, no analytics that fingerprint the
  document content.
