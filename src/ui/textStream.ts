import { countCharacters, countLines, countWords, pluralize } from "../lib/textStats";

export interface TextStream {
  show(text: string): void;
  clear(): void;
}

/**
 * The "what the ATS actually gets" half of the split view: the raw stream, in
 * parse order, with the counts a parser would see.
 *
 * Text is set via textContent, never innerHTML — the stream is untrusted
 * content from the user's own file, and it must render exactly as extracted.
 */
export function createTextStream(
  root: HTMLElement,
  onCopy: (text: string) => void,
): TextStream {
  const stats = document.createElement("p");
  stats.className = "stream__stats";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "button button--ghost stream__copy";
  copyButton.textContent = "Copy text";

  const header = document.createElement("div");
  header.className = "stream__header";
  header.append(stats, copyButton);

  const pre = document.createElement("pre");
  pre.className = "stream__text";
  pre.tabIndex = 0;

  root.append(header, pre);

  let current = "";
  copyButton.addEventListener("click", () => onCopy(current));

  return {
    show(text) {
      current = text;
      pre.textContent = text;
      pre.classList.toggle("stream__text--empty", text.length === 0);

      if (text.length === 0) {
        pre.textContent = "The parser extracted nothing at all from this file.";
        stats.textContent = "0 characters extracted";
      } else {
        stats.textContent = [
          pluralize(countWords(text), "word"),
          pluralize(countCharacters(text), "character"),
          pluralize(countLines(text), "line"),
        ].join(" · ");
      }

      copyButton.disabled = text.length === 0;
    },

    clear() {
      current = "";
      pre.textContent = "";
      stats.textContent = "";
      copyButton.disabled = true;
    },
  };
}
