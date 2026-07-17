import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import type { DocumentPreview, ParseWarning, Rect } from "../parsers/types";

/** Cap the backing store so a hi-dpi screen cannot allocate an enormous canvas. */
const MAX_CANVAS_SCALE = 3;

/**
 * pdf.js refuses to render a page onto a canvas that is already rendering, and
 * a resize can easily land mid-draw. Tracking the task per canvas lets a new
 * draw cancel the one it supersedes.
 */
const inFlight = new WeakMap<HTMLCanvasElement, RenderTask>();

export interface DocumentView {
  /** Draw a parsed document's original layout with its warning regions. */
  show(preview: DocumentPreview, warnings: readonly ParseWarning[]): Promise<void>;
  /** Pulse a warning's regions and scroll the first into view. */
  focus(warningId: string): void;
  clear(): void;
}

/**
 * The "original" half of the split view: the document as the eye sees it, with
 * the parser's problem areas boxed on top.
 *
 * Regions are positioned in percentages of the page box, so a resize needs no
 * coordinate math — only the canvas is redrawn, to stay crisp.
 */
export function createDocumentView(
  root: HTMLElement,
  onRegionActivate: (warningId: string) => void,
): DocumentView {
  let redraw: (() => void) | null = null;
  let currentDoc: PDFDocumentProxy | null = null;
  let resizeTimer: number | undefined;

  const observer =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          window.clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(() => redraw?.(), 150);
        });
  observer?.observe(root);

  root.addEventListener("click", (event) => {
    const region = (event.target as HTMLElement).closest<HTMLElement>("[data-warning-id]");
    if (region?.dataset.warningId) onRegionActivate(region.dataset.warningId);
  });

  async function clear(): Promise<void> {
    redraw = null;
    root.replaceChildren();
    await currentDoc?.destroy();
    currentDoc = null;
  }

  return {
    async show(preview, warnings) {
      await clear();
      if (preview.kind === "html") {
        root.append(htmlPage(preview.html));
      } else {
        redraw = await renderPdf(root, preview.source, warnings, (doc) => {
          currentDoc = doc;
        });
      }
      sweep(root);
    },

    focus(warningId) {
      const regions = root.querySelectorAll<HTMLElement>(
        `[data-warning-id="${CSS.escape(warningId)}"]`,
      );
      regions.forEach((region) => {
        region.classList.remove("region--pulse");
        // Force a reflow so re-adding the class restarts the animation.
        void region.offsetWidth;
        region.classList.add("region--pulse");
      });
      regions[0]?.scrollIntoView({ block: "center", behavior: "smooth" });
    },

    clear() {
      void clear();
    },
  };
}

/** A DOCX has no page geometry: show mammoth's rendering of the body. */
function htmlPage(html: string): HTMLElement {
  const page = document.createElement("article");
  page.className = "page page--html";
  page.innerHTML = html;
  return page;
}

async function renderPdf(
  root: HTMLElement,
  source: ArrayBuffer,
  warnings: readonly ParseWarning[],
  keepDoc: (doc: PDFDocumentProxy) => void,
): Promise<() => void> {
  const doc = await pdfjsLib.getDocument({ data: source.slice(0) }).promise;
  keepDoc(doc);

  const canvases: { canvas: HTMLCanvasElement; pageNumber: number }[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });

    const figure = document.createElement("figure");
    figure.className = "page";
    figure.style.aspectRatio = `${viewport.width} / ${viewport.height}`;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", `Page ${pageNumber} of your document`);
    figure.append(canvas);

    const overlay = document.createElement("div");
    overlay.className = "regions";
    for (const warning of warnings.filter((w) => w.pageNumber === pageNumber)) {
      for (const region of warning.regions) {
        overlay.append(regionBox(warning, region, viewport));
      }
    }
    figure.append(overlay);

    root.append(figure);
    canvases.push({ canvas, pageNumber });
  }

  const draw = () => {
    for (const { canvas, pageNumber } of canvases) {
      void drawPage(doc, canvas, pageNumber);
    }
  };
  draw();
  return draw;
}

async function drawPage(
  doc: PDFDocumentProxy,
  canvas: HTMLCanvasElement,
  pageNumber: number,
): Promise<void> {
  const width = canvas.clientWidth;
  if (width === 0) return;

  // A superseded draw is worthless; cancel it rather than let pdf.js reject
  // the second render outright.
  inFlight.get(canvas)?.cancel();

  const page = await doc.getPage(pageNumber);
  const unscaled = page.getViewport({ scale: 1 });
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_CANVAS_SCALE);
  const viewport = page.getViewport({ scale: (width / unscaled.width) * dpr });

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const context = canvas.getContext("2d");
  if (!context) return;

  const task = page.render({ canvasContext: context, viewport });
  inFlight.set(canvas, task);

  try {
    await task.promise;
  } catch (error) {
    // Cancellation is the expected outcome of a resize, not a failure.
    if ((error as Error)?.name !== "RenderingCancelledException") throw error;
  } finally {
    if (inFlight.get(canvas) === task) inFlight.delete(canvas);
  }
}

/**
 * One highlight box, positioned as a percentage of the page so it survives
 * resize without recomputation.
 */
function regionBox(
  warning: ParseWarning,
  region: Rect,
  viewport: { width: number; height: number },
): HTMLElement {
  const box = document.createElement("button");
  box.type = "button";
  box.className = `region region--${warning.kind}`;
  box.dataset.warningId = warning.id;
  box.setAttribute("aria-label", `${warning.title}. Show details.`);

  box.style.left = `${(region.x / viewport.width) * 100}%`;
  box.style.top = `${(region.y / viewport.height) * 100}%`;
  box.style.width = `${(region.w / viewport.width) * 100}%`;
  box.style.height = `${(region.h / viewport.height) * 100}%`;

  return box;
}

/**
 * The scan-line sweep: a cyan line crosses the document once on a successful
 * parse, revealing the highlighted regions in its wake. Pure CSS animation, so
 * `prefers-reduced-motion` handling lives with the rest of the styles.
 */
function sweep(root: HTMLElement): void {
  root.classList.remove("is-scanning");
  void root.offsetWidth;
  root.classList.add("is-scanning");
}
