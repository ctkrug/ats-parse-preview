# Design

## 1. Aesthetic direction

**Blueprint/technical.** ATS Parse Preview reads like an annotated engineering schematic: your
resume rendered on a deep blueprint-navy sheet, cyan grid lines underneath, amber callouts
marking exactly where the parse breaks. The tool is literally reverse-engineering a document —
the visual language should say "diagnostic instrument," not "consumer SaaS card grid." This
also structurally differs from a dark-glassy or neo-brutalist direction, keeping it distinct in
the portfolio.

## 2. Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0b1f33` | page background |
| `--surface-1` | `#122b45` | panels (upload zone, text stream panel) |
| `--surface-2` | `#1a3a5c` | raised surfaces (cards, active panel headers) |
| `--text` | `#e8f1fa` | primary text |
| `--text-muted` | `#7a93ad` | secondary text, captions |
| `--accent` | `#3fd0f0` | grid lines, links, primary interactive accent (cyan) |
| `--accent-support` | `#ffb347` | warning callouts / highlighted regions (amber) |
| `--success` | `#4ade80` | "no issues found" state |
| `--danger` | `#ff5470` | parse errors, unsupported file |

- **Type pairing:** Display — **JetBrains Mono** (wordmark, headings; monospace reinforces the
  "raw text stream" theme). UI — **Inter** (body copy, warning explanations). System fallbacks:
  `ui-monospace, "SF Mono", monospace` / `system-ui, sans-serif`.
- **Spacing unit:** 8px scale (8/16/24/32/48/64).
- **Corner radius:** 4px — sharp, drafting-table edges, not soft/glassy.
- **Shadow/glow:** interactive elements get a 1px `--accent` border plus a soft cyan glow
  (`box-shadow: 0 0 0 1px var(--accent), 0 0 16px rgba(63,208,240,0.25)`) on focus/hover, not a
  drop shadow.
- **Motion:** UI transitions 150ms ease-out. The scan sweep (below) runs 900ms ease-in-out.

## 3. Layout intent

The hero is the **split parse view**: original rendered document (left on desktop, top on
phone) beside the raw extracted text stream (right / bottom), each taking roughly half of a
region that fills ≥65% of the viewport height on desktop. Warnings list docks below/beside as a
narrower rail — supporting content, not competing for the hero's space.

- **1440×900 desktop:** three-column feel — document render (~40%), text stream (~40%),
  warnings rail (~20%) — all within one framed "sheet" area on the blueprint background, with
  grid-line texture visible in the surrounding gutter so the frame doesn't float in dead space.
- **390×844 phone:** stacked single column — document render, then text stream, then warnings —
  each full-width, sticky tab switcher between "Document" and "Text" if both can't fit above the
  fold comfortably.

## 4. Signature detail

A **scan-line sweep**: on successful parse, a thin cyan line animates once top-to-bottom across
the rendered document (900ms), leaving highlighted warning regions "revealed" in its wake like a
schematic being scanned. This single animation sells the "X-ray into what the ATS sees" concept
better than any copy could. The favicon is a monogram: a bracket pair `⌐¬` styled as crosshair
corners around a small "A", in `--accent` on `--bg`, generated as an inline SVG data URI.

## 5. Juice plan

Not a game, but the scan sweep and warning-region reveals get the same care as game feedback:

- Document upload → visible response (drop-zone border pulse) in <100ms.
- Parse complete → scan-line sweep (900ms ease-in-out) rather than content just appearing.
- Warning region highlight → brief amber pulse (140ms) when first revealed, then settles to a
  steady outline.
- No sound — this is a focused diagnostic tool used in professional/job-search contexts where
  audio would be unwelcome; motion carries the feedback instead.
- Respects `prefers-reduced-motion`: scan sweep and pulses collapse to an instant state change.
