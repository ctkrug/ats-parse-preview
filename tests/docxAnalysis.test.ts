import { describe, expect, it } from "vitest";
import { analyzeDocxHtml, warnOnSkippedContent } from "../src/lib/docxAnalysis";

describe("analyzeDocxHtml", () => {
  it("returns no warnings for an empty document", () => {
    expect(analyzeDocxHtml("")).toEqual([]);
  });

  it("returns no warnings for plain paragraphs", () => {
    expect(analyzeDocxHtml("<p>Senior Engineer</p><p>2019 to 2024</p>")).toEqual([]);
  });

  it("warns about a table", () => {
    const warnings = analyzeDocxHtml("<table><tr><td>Role</td></tr></table>");

    expect(warnings).toHaveLength(1);
    expect(warnings[0].kind).toBe("table");
    expect(warnings[0].title).toBe("Table detected");
  });

  it("counts multiple tables in the title", () => {
    const html = "<table><tr><td>a</td></tr></table><p>x</p><table><tr><td>b</td></tr></table>";
    expect(analyzeDocxHtml(html)[0].title).toBe("2 tables detected");
  });

  it("warns about an image", () => {
    const warnings = analyzeDocxHtml('<img src="data:image/png;base64,AAA" />');

    expect(warnings).toHaveLength(1);
    expect(warnings[0].kind).toBe("no-text-layer");
  });

  it("reports both a table and an image", () => {
    const html = '<table><tr><td>a</td></tr></table><img src="x.png">';
    expect(analyzeDocxHtml(html).map((w) => w.kind)).toEqual(["table", "no-text-layer"]);
  });

  it("matches tags case-insensitively", () => {
    expect(analyzeDocxHtml("<TABLE><TR><TD>a</TD></TR></TABLE>")).toHaveLength(1);
  });

  it("does not match a word that merely starts with the tag name", () => {
    expect(analyzeDocxHtml("<p>I built a tablet imaging app</p>")).toEqual([]);
  });

  it("explains why each warning matters", () => {
    for (const warning of analyzeDocxHtml('<table><tr><td>a</td></tr></table><img src="x">')) {
      expect(warning.explanation.length).toBeGreaterThan(40);
    }
  });

  it("carries no regions, since a DOCX has no rendered page to highlight", () => {
    expect(analyzeDocxHtml("<table><tr><td>a</td></tr></table>")[0].regions).toEqual([]);
  });
});

describe("warnOnSkippedContent", () => {
  it("returns null when the converter skipped nothing", () => {
    expect(warnOnSkippedContent(500, [])).toBeNull();
  });

  it("returns null for messages that are not about skipped content", () => {
    expect(warnOnSkippedContent(500, [{ message: "converted a paragraph" }])).toBeNull();
  });

  it("warns when the converter reports unrecognised elements", () => {
    const warning = warnOnSkippedContent(500, [
      { message: "Unrecognised paragraph style: TextBox" },
    ]);

    expect(warning).not.toBeNull();
    expect(warning!.title).toBe("Some content was skipped");
    expect(warning!.explanation).toContain("1 element(s)");
  });

  it("counts every skip message", () => {
    const warning = warnOnSkippedContent(500, [
      { message: "Unrecognised style: TextBox" },
      { message: "Ignoring shape element" },
      { message: "converted fine" },
    ]);
    expect(warning!.explanation).toContain("2 element(s)");
  });

  it("says so plainly when nothing at all was extracted", () => {
    const warning = warnOnSkippedContent(0, [{ message: "Unsupported element" }]);
    expect(warning!.explanation).toContain("Nothing at all was extracted");
  });
});
