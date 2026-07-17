import { createLatestGuard } from "./lib/latestRequest";
import { ParseError, parseFile } from "./parsers";
import type { ExtractedDocument } from "./parsers/types";
import { createDocumentView } from "./ui/documentView";
import { createDropZone } from "./ui/dropZone";
import { createTextStream } from "./ui/textStream";
import { createWarningsRail } from "./ui/warningsRail";

/**
 * Wires behaviour onto the shell in index.html. The static half of the page
 * (masthead, drop zone, explainer, FAQ, footer) is authored as real markup
 * there rather than injected from here, so it is in the document a crawler
 * fetches and it paints before this bundle, which is mostly pdf.js, arrives.
 * Everything below only fills the panels the shell leaves empty.
 */
const el = <T extends HTMLElement>(id: string): T => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element #${id}`);
  return found as T;
};

const statusBar = el("status");
const dropSection = el("drop");
const explainer = el("explainer");
const workspace = el("workspace");
const switcher = el("switcher");
const fileName = el("file-name");
const resetButton = el<HTMLButtonElement>("reset");

const documentView = createDocumentView(el("doc"), showInRail);
const textStream = createTextStream(el("stream"), (text) => void copyText(text));
const warningsRail = createWarningsRail(el("rail"), (id) => documentView.focus(id));

createDropZone(dropSection, (file) => void handleFile(file));

const fileGuard = createLatestGuard();

// The drop zone is hidden once a result shows, so this is the only way back
// to it without a full page reload.
resetButton.addEventListener("click", () => {
  fileGuard.start(); // invalidate any parse still in flight for the old file
  showEmpty();
  setStatus("", "none");
});

/** Clicking a highlighted region surfaces its explanation in the rail. */
function showInRail(warningId: string): void {
  const button = document.querySelector<HTMLElement>(
    `.rail__button[data-warning-id="${CSS.escape(warningId)}"]`,
  );
  button?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  button?.focus();
}

function setStatus(message: string, kind: "error" | "busy" | "none"): void {
  statusBar.replaceChildren();
  if (kind === "none") return;

  const box = document.createElement("p");
  box.className = kind === "busy" ? "status status--busy" : "status";

  if (kind === "busy") {
    const spinner = document.createElement("span");
    spinner.className = "status__spinner";
    box.append(spinner);
  }

  box.append(document.createTextNode(message));
  statusBar.append(box);
}

async function handleFile(file: File): Promise<void> {
  const token = fileGuard.start();
  setStatus(`Parsing ${file.name}…`, "busy");

  try {
    const parsed = await parseFile(file);
    if (!fileGuard.isCurrent(token)) return;
    await showResult(parsed);
    if (!fileGuard.isCurrent(token)) return;
    setStatus("", "none");
  } catch (error) {
    if (!fileGuard.isCurrent(token)) return;
    showEmpty();
    setStatus(
      error instanceof ParseError
        ? error.message
        : "Something went wrong reading that file. Try another one.",
      "error",
    );
  }
}

async function showResult(parsed: ExtractedDocument): Promise<void> {
  fileName.textContent = parsed.fileName;
  textStream.show(parsed.text);
  warningsRail.show(parsed.warnings);

  // The explainer is the empty state's supporting copy; once a real parse is on
  // screen the rail explains each warning in context and it is just noise.
  dropSection.hidden = true;
  explainer.hidden = true;
  workspace.hidden = false;
  switcher.hidden = false;
  resetButton.hidden = false;

  await documentView.show(parsed.preview, parsed.warnings);
}

function showEmpty(): void {
  documentView.clear();
  textStream.clear();
  warningsRail.clear();
  fileName.textContent = "";

  dropSection.hidden = false;
  explainer.hidden = false;
  workspace.hidden = true;
  switcher.hidden = true;
  resetButton.hidden = true;
}

async function copyText(text: string): Promise<void> {
  const button = document.querySelector<HTMLButtonElement>(".stream__copy");

  try {
    await navigator.clipboard.writeText(text);
    if (button) {
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = "Copy text";
      }, 1400);
    }
  } catch {
    // Clipboard permission can be denied outright; say so rather than no-op.
    setStatus("Your browser blocked clipboard access — select the text and copy it.", "error");
  }
}

switcher.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLElement>("[data-panel]");
  if (!button?.dataset.panel) return;

  workspace.dataset.panel = button.dataset.panel;
  switcher.querySelectorAll("[data-panel]").forEach((other) => {
    other.setAttribute("aria-pressed", String(other === button));
  });
});
