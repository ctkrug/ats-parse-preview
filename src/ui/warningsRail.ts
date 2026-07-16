import type { ParseWarning, WarningKind } from "../parsers/types";

const KIND_LABELS: Record<WarningKind, string> = {
  "multi-column": "Columns",
  table: "Table",
  "no-text-layer": "No text",
};

export interface WarningsRail {
  show(warnings: readonly ParseWarning[]): void;
  clear(): void;
}

/**
 * The diagnostic list: every structural problem, why it matters to an ATS, and
 * a way back to where it happens in the document.
 */
export function createWarningsRail(
  root: HTMLElement,
  onSelect: (warningId: string) => void,
): WarningsRail {
  const heading = document.createElement("h2");
  heading.className = "rail__heading";

  const list = document.createElement("ul");
  list.className = "rail__list";

  root.append(heading, list);

  list.addEventListener("click", (event) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>("[data-warning-id]");
    if (item?.dataset.warningId) onSelect(item.dataset.warningId);
  });

  return {
    show(warnings) {
      list.replaceChildren();

      if (warnings.length === 0) {
        heading.textContent = "No issues found";
        list.append(cleanState());
        return;
      }

      heading.textContent =
        warnings.length === 1 ? "1 issue found" : `${warnings.length} issues found`;
      for (const warning of warnings) list.append(warningItem(warning));
    },

    clear() {
      heading.textContent = "";
      list.replaceChildren();
    },
  };
}

function warningItem(warning: ParseWarning): HTMLElement {
  const item = document.createElement("li");
  item.className = `rail__item rail__item--${warning.kind}`;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "rail__button";
  button.dataset.warningId = warning.id;
  // Regions only exist for a rendered PDF page; a DOCX warning has nowhere to jump to.
  button.disabled = warning.regions.length === 0;

  const tag = document.createElement("span");
  tag.className = "rail__tag";
  tag.textContent = KIND_LABELS[warning.kind];

  const title = document.createElement("h3");
  title.className = "rail__title";
  title.textContent = warning.title;

  const explanation = document.createElement("p");
  explanation.className = "rail__explanation";
  explanation.textContent = warning.explanation;

  button.append(tag, title, explanation);
  if (!button.disabled) {
    const hint = document.createElement("span");
    hint.className = "rail__hint";
    hint.textContent = "Show me where →";
    button.append(hint);
  }

  item.append(button);
  return item;
}

/** The designed success state: a clean parse is a result, not an empty list. */
function cleanState(): HTMLElement {
  const item = document.createElement("li");
  item.className = "rail__clean";

  const title = document.createElement("p");
  title.className = "rail__clean-title";
  title.textContent = "This document parses cleanly.";

  const body = document.createElement("p");
  body.className = "rail__clean-body";
  body.textContent =
    "No scrambled columns, no tables read out of order, and text on every page. " +
    "Read the stream on the left — that is what a recruiter's system receives.";

  item.append(title, body);
  return item;
}
