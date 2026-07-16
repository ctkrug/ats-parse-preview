import { describe, expect, it } from "vitest";
import { ParseError, describeParseFailure } from "../src/lib/parseErrors";

const named = (name: string, message = "boom"): Error => {
  const error = new Error(message);
  error.name = name;
  return error;
};

describe("ParseError", () => {
  it("is an Error carrying the message shown to the user", () => {
    const error = new ParseError("That file is empty.");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ParseError");
    expect(error.message).toBe("That file is empty.");
  });
});

describe("describeParseFailure", () => {
  it("explains a password-protected PDF", () => {
    const message = describeParseFailure("pdf", named("PasswordException"));
    expect(message).toContain("password-protected");
  });

  it("explains an invalid PDF by error name", () => {
    const message = describeParseFailure("pdf", named("InvalidPDFException"));
    expect(message).toContain("not a readable PDF");
  });

  it("explains an invalid PDF reported only in the message", () => {
    const message = describeParseFailure("pdf", new Error("Invalid PDF structure"));
    expect(message).toContain("not a readable PDF");
  });

  it("explains a corrupt DOCX", () => {
    const message = describeParseFailure("docx", new Error("End of central directory not found"));
    expect(message).toContain("not a readable DOCX");
  });

  it("does not use the DOCX zip wording for a PDF failure", () => {
    const message = describeParseFailure("pdf", new Error("corrupt zip"));
    expect(message).toContain("This PDF could not be parsed");
  });

  it("falls back to a plain message naming the file kind", () => {
    expect(describeParseFailure("pdf", new Error("kaboom"))).toContain("This PDF");
    expect(describeParseFailure("docx", new Error("kaboom"))).toContain("This DOCX");
  });

  it("handles a thrown non-Error value without crashing", () => {
    expect(describeParseFailure("pdf", "just a string")).toContain("This PDF");
    expect(describeParseFailure("docx", null)).toContain("This DOCX");
    expect(describeParseFailure("pdf", undefined)).toContain("This PDF");
  });

  it("never leaks a raw stack trace into the message", () => {
    const error = named("TypeError", "Cannot read properties of undefined (reading 'x')");
    const message = describeParseFailure("pdf", error);

    expect(message).not.toContain("undefined");
    expect(message).not.toContain("TypeError");
  });
});
