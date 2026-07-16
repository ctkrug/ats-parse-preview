import { describe, expect, it } from "vitest";
import { countWords } from "../src/lib/textStats";

describe("countWords", () => {
  it("counts space-separated words", () => {
    expect(countWords("Senior Software Engineer")).toBe(3);
  });

  it("collapses repeated whitespace and newlines", () => {
    expect(countWords("  Line one  \n\n Line two ")).toBe(4);
  });

  it("returns zero for empty or whitespace-only input", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
  });
});
