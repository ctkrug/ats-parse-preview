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
      <span class="wordmark__bracket">&#8968;</span>Read<span class="wordmark__thin">out</span><span class="wordmark__bracket">&#8971;</span>
    </h1>
    <p class="masthead__tag">
      See the exact plain text a resume parser pulls out of your file, and where your
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

  <section class="explainer" id="explainer">
    <article class="explainer__lead">
      <h2 class="explainer__headline">Why isn't my resume passing ATS?</h2>
      <p>
        Usually it is not your experience. It is your file. An applicant tracking system does
        not look at a resume the way you do: it flattens the whole document into one stream of
        text, reads that stream in whatever order the file emits it, and hands the result to a
        keyword matcher. Your layout is gone before anyone scores you.
      </p>
      <p>
        That is harmless for a plain single-column resume. It goes wrong when the template gets
        clever. A two-column layout only survives if the file writes the left column out in full
        before it starts the right one. Plenty of templates instead write line by line across
        both, so the parser reads straight across the gutter and your job title lands next to
        the other column's dates. Tables split labels from their values the same way. A resume
        exported as an image parses to nothing at all.
      </p>
      <p class="explainer__kicker">
        None of that is visible on the page, which is why silence after forty applications is so
        hard to debug. Readout shows you the stream itself, then marks the places on your own
        layout where it broke.
      </p>
    </article>

    <div class="faq">
      <h2 class="faq__heading">Questions</h2>
      <div class="faq__list">
        <details class="faq__item">
          <summary class="faq__q">Is this an ATS resume checker with no email?</summary>
          <p class="faq__a">
            Yes. No email field, no account, no upsell at the end. Readout is a resume checker
            without signup because there is nothing to sign up to: it is a static page, and the
            parsing happens in JavaScript that is already running in your tab.
          </p>
        </details>
        <details class="faq__item">
          <summary class="faq__q">Where does my resume get uploaded?</summary>
          <p class="faq__a">
            Nowhere. pdf.js and mammoth.js run in your browser, so the file never leaves your
            machine. Open your network tab, drop a resume in, and watch: nothing fires. It also
            keeps working with your wifi switched off, which is the quickest way to prove the
            claim rather than trust it.
          </p>
        </details>
        <details class="faq__item">
          <summary class="faq__q">Why is there no score out of 100?</summary>
          <p class="faq__a">
            Because it would be invented. Hundreds of ATS vendors each parse a little
            differently, so a single number implies a precision nobody actually has. The
            extracted text is checkable instead: read it and see for yourself whether your job
            title survived.
          </p>
        </details>
        <details class="faq__item">
          <summary class="faq__q">Are two-column resume templates safe?</summary>
          <p class="faq__a">
            Some are. The look is not the problem, the emission order is. Readout counts how
            often the parse hops between your columns. One hop means the file writes each column
            as a block and it reads correctly. A hop on nearly every line means it is
            scrambling. Drop yours in and you will know which one you have.
          </p>
        </details>
        <details class="faq__item">
          <summary class="faq__q">My resume looks fine. Is it worth checking?</summary>
          <p class="faq__a">
            That is the case most worth checking. A file that looks perfect and parses to word
            salad is the exact failure this tool exists to catch, and the one you cannot spot by
            looking at the page.
          </p>
        </details>
      </div>
    </div>
  </section>

  <footer class="footer">
    <p class="footnote">
      Everything runs in your browser with pdf.js and mammoth.js. Open your network tab and
      watch nothing leave.
    </p>
    <p class="footnote">
      <a href="https://github.com/ctkrug/ats-parse-preview">Source on GitHub</a>
      <span class="footnote__dot" aria-hidden="true">&middot;</span>
      <a href="https://apps.charliekrug.com">More by Charlie Krug &rarr; apps.charliekrug.com</a>
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
