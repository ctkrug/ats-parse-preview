import { createLatestGuard } from "./lib/latestRequest";
import { ParseError, parseFile } from "./parsers";
import type { ExtractedDocument } from "./parsers/types";
import { createDocumentView } from "./ui/documentView";
import { createDropZone } from "./ui/dropZone";
import { createTextStream } from "./ui/textStream";
import { createWarningsRail } from "./ui/warningsRail";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app root element");

app.innerHTML = `
  <header class="masthead">
    <h1 class="wordmark">
      <span class="wordmark__bracket">&#8968;</span>ATS<span class="wordmark__thin">parse</span><span class="wordmark__bracket">&#8971;</span>
    </h1>
    <p class="masthead__tag">
      See the exact plain text a resume parser pulls out of your file — and where your
      layout scrambles it.
    </p>
    <div class="masthead__actions">
      <button class="button button--ghost masthead__reset" id="reset" type="button" hidden>
        Check another file
      </button>
      <p class="masthead__privacy">&#9679; Parsed in your browser. Never uploaded.</p>
    </div>
  </header>

  <div id="status" role="status" aria-live="polite"></div>

  <section class="drop" id="drop">
    <p class="drop__hint">PDF or DOCX &middot; up to 10 MB</p>
    <h2 class="drop__headline">Drop your resume. See what the robot <em>actually</em> reads.</h2>
    <p class="drop__body">
      Your columns and tables look fine to you. To an applicant tracking system they can come
      apart into word salad. This shows you the raw text stream, with the damage marked on
      your own layout.
    </p>
    <input class="drop__input" id="file" type="file" accept=".pdf,.docx" />
    <label class="drop__label" for="file">
      <span class="button">Choose a file</span>
    </label>
  </section>

  <div class="switcher" id="switcher" hidden>
    <button class="button" type="button" data-panel="doc" aria-pressed="true">Document</button>
    <button class="button" type="button" data-panel="text" aria-pressed="false">Text stream</button>
  </div>

  <section class="workspace" id="workspace" data-panel="doc" hidden>
    <section class="panel panel--doc">
      <header class="panel__header">
        <h2 class="panel__title">Your document</h2>
        <span class="panel__note" id="file-name"></span>
      </header>
      <div class="doc" id="doc"></div>
    </section>

    <section class="panel panel--stream stream" id="stream">
      <header class="panel__header">
        <h2 class="panel__title">What the ATS reads</h2>
        <span class="panel__note">parse order</span>
      </header>
    </section>

    <aside class="rail" id="rail" aria-label="Parse warnings"></aside>
  </section>

  <footer>
    <p class="footnote">
      Everything runs client-side with pdf.js and mammoth.js — open your network tab and
      watch nothing leave.
    </p>
  </footer>
`;

const el = <T extends HTMLElement>(id: string): T => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element #${id}`);
  return found as T;
};

const statusBar = el("status");
const dropSection = el("drop");
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

  dropSection.hidden = true;
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
