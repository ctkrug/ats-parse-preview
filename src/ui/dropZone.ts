/**
 * The upload surface: drag-and-drop plus a real file input behind a styled
 * label, so the keyboard and screen-reader path is the browser's own.
 *
 * Drag events fire per child element, so the highlight is refcounted rather
 * than toggled — otherwise dragging over the inner text clears the state.
 */
export function createDropZone(root: HTMLElement, onFile: (file: File) => void): void {
  let depth = 0;

  const setDragging = (dragging: boolean) => {
    root.classList.toggle("drop--active", dragging);
  };

  const input = root.querySelector<HTMLInputElement>("input[type=file]");
  input?.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) onFile(file);
    // Reset so re-picking the same file still fires a change event.
    input.value = "";
  });

  root.addEventListener("dragenter", (event) => {
    event.preventDefault();
    depth++;
    setDragging(true);
  });

  root.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  });

  root.addEventListener("dragleave", (event) => {
    event.preventDefault();
    depth = Math.max(0, depth - 1);
    if (depth === 0) setDragging(false);
  });

  root.addEventListener("drop", (event) => {
    event.preventDefault();
    depth = 0;
    setDragging(false);

    const file = event.dataTransfer?.files?.[0];
    if (file) onFile(file);
  });

  // A file dropped outside the zone would otherwise navigate away from the app.
  const blockNavigation = (event: DragEvent) => event.preventDefault();
  window.addEventListener("dragover", blockNavigation);
  window.addEventListener("drop", blockNavigation);
}
