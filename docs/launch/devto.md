---
title: "A two-column resume is not the bug. The emission order is."
published: false
tags: typescript, webdev, testing, pdf
---

I built [Readout](https://apps.charliekrug.com/ats-parse-preview/) because I could not answer a
simple question: when I upload a resume to a job board, what does the machine on the other end
actually read?

Every tool that claims to answer that wants an email address first, and gives back a score out
of 100. A score is unfalsifiable. It cannot tell you which line broke. So I wrote something that
shows the raw extracted text next to your original layout and marks the places they disagree. It
runs entirely in the browser with pdf.js and mammoth.js, which means there is no upload endpoint,
because there is no server.

Two things in the build turned out to be more interesting than I expected.

## The detector I got wrong first

The headline feature is catching a two-column layout that an ATS scrambles. My first instinct was
the obvious one: find the columns, and if there are two, warn about it.

That is wrong, and it took a real fixture to see why. An applicant tracking system flattens a PDF
into one stream of text in whatever order the file's content stream emits it. A two-column layout
survives that perfectly well **if** the file writes the left column out in full before starting
the right one. Plenty of templates do. Others write line by line across both columns, and then the
parser reads straight across the gutter:

```
SKILLS EXPERIENCE
TypeScript Senior Engineer, Acme Corp
Go 2019 - 2024, Berlin
```

"Go" is now a year of employment in Berlin. Same visual layout, completely different outcome.

So the thing worth measuring is not the geometry, it is the emission order. The detector finds the
column bounds, then walks the runs in native order and counts how often the parse hops from one
column to the other. Reading two columns correctly takes exactly one hop, at the bottom of the
first column. A file that scrambles hops on nearly every line. The warning fires on the crossing
count, not on the existence of columns.

That distinction is the whole product. It is also why the tool stays quiet on layouts that happen
to read fine, which I think is the only honest way to build this.

## Writing PDF bytes by hand

Here is the problem with testing that: every PDF library I could reach for abstracts away the
exact thing under test. I needed to control the order the content stream emits text, and
`pdf-lib` or friends decide that for me.

So the fixtures write the PDF by hand. A few hundred bytes of objects, an xref table, and a
content stream of literal `BT /F1 11 Tf 1 0 0 1 60 700 Tm (Skill entry 0) Tj ET` operators in a
fixed order. Then real pdf.js parses those bytes in the test, so the integration suite exercises
the same library the app ships.

This paid off in a way I did not plan for. Once the fixture builder existed, I added an accented
character to a test name and got mojibake back. The bug was mine: I was encoding the PDF string as
UTF-8, while the page's font declared `/Encoding /WinAnsiEncoding`, so pdf.js was faithfully
decoding my two UTF-8 bytes as two separate WinAnsi characters. A fixture builder honest enough to
reproduce a real encoding mismatch is worth more than a mock that always agrees with you. The
builder now throws on any codepoint it cannot represent in a single WinAnsi byte, rather than
silently writing something it would then read back wrong.

## What I would do differently

The bundle is 885 kB, almost all pdf.js. Someone checking a DOCX pays for a PDF renderer they
never use. I would lazy-load the parsers behind the file-type check from the start rather than
importing both at the top of the module graph.

I also still do not detect floating text boxes in PDFs, which is one of the nastier ATS failures:
the content looks fine and simply never reaches the parser. It is in the backlog. The DOCX path
catches its equivalent already, since mammoth tells you what it skipped.

Code is at [github.com/ctkrug/ats-parse-preview](https://github.com/ctkrug/ats-parse-preview),
MIT. If you have a resume that comes out scrambled in an interesting way, I would like to see it.
