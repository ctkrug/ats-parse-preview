export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function countCharacters(text: string): number {
  return text.trim().length;
}

export function countLines(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split("\n").length;
}

/** Pluralize a count for the stats strip: "1 word", "12 words". */
export function pluralize(count: number, noun: string): string {
  return `${count.toLocaleString()} ${noun}${count === 1 ? "" : "s"}`;
}
