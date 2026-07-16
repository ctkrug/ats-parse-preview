/**
 * The upload surface: drag-and-drop plus a real file input behind a styled
 * label, so the keyboard and screen-reader path is the browser's own.
 *
 * Drag events fire per child element, so the highlight is refcounted rather
 * than toggled — otherwise dragging over the inner text clears the state.
 */
export function createDropZone(
  root: HTMLElement,
  onFile: (file: File) => void,
): { destroy(): void } {
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

  const onDragEnter = (event: DragEvent) => {
    event.preventDefault();
    depth++;
    setDragging(true);
  };

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  };

  const onDragLeave = (event: DragEvent) => {
    event.preventDefault();
    depth = Math.max(0, depth - 1);
    if (depth === 0) setDragging(false);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    depth = 0;
    setDragging(false);

    const file = event.dataTransfer?.files?.[0];
    if (file) onFile(file);
  };

  root.addEventListener("dragenter", onDragEnter);
  root.addEventListener("dragover", onDragOver);
  root.addEventListener("dragleave", onDragLeave);
  root.addEventListener("drop", onDrop);

  // A file dropped outside the zone would otherwise navigate away from the app.
  const blockNavigation = (event: DragEvent) => event.preventDefault();
  window.addEventListener("dragover", blockNavigation);
  window.addEventListener("drop", blockNavigation);

  return {
    destroy() {
      root.removeEventListener("dragenter", onDragEnter);
      root.removeEventListener("dragover", onDragOver);
      root.removeEventListener("dragleave", onDragLeave);
      root.removeEventListener("drop", onDrop);
      window.removeEventListener("dragover", blockNavigation);
      window.removeEventListener("drop", blockNavigation);
    },
  };
}
