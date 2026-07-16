import { describe, expect, it } from "vitest";
import {
  countCharacters,
  countLines,
  countWords,
  pluralize,
} from "../src/lib/textStats";

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
    expect(countWords("\n\t ")).toBe(0);
  });
});

describe("countCharacters", () => {
  it("counts characters excluding surrounding whitespace", () => {
    expect(countCharacters("  hello  ")).toBe(5);
  });

  it("counts interior whitespace", () => {
    expect(countCharacters("a b")).toBe(3);
  });

  it("returns zero for empty or whitespace-only input", () => {
    expect(countCharacters("")).toBe(0);
    expect(countCharacters("   \n ")).toBe(0);
  });
});

describe("countLines", () => {
  it("counts newline-separated lines", () => {
    expect(countLines("one\ntwo\nthree")).toBe(3);
  });

  it("counts a single line with no newline", () => {
    expect(countLines("just one")).toBe(1);
  });

  it("ignores leading and trailing blank lines", () => {
    expect(countLines("\n\none\ntwo\n\n")).toBe(2);
  });

  it("returns zero for empty or whitespace-only input", () => {
    expect(countLines("")).toBe(0);
    expect(countLines("  \n ")).toBe(0);
  });
});

describe("pluralize", () => {
  it("uses the singular for exactly one", () => {
    expect(pluralize(1, "word")).toBe("1 word");
  });

  it("uses the plural for zero and many", () => {
    expect(pluralize(0, "word")).toBe("0 words");
    expect(pluralize(2, "word")).toBe("2 words");
  });

  it("groups thousands for readability", () => {
    expect(pluralize(1200, "character")).toBe("1,200 characters");
  });
});
