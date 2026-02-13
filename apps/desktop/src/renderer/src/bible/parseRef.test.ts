import { describe, expect, it } from "vitest";
import { parseReference } from "./parseRef";

describe("parseReference", () => {
  it("parses a range reference", () => {
    expect(parseReference("Jean 3:16-18")).toEqual({
      bookId: "JHN",
      bookName: "Jean",
      chapter: 3,
      from: 16,
      to: 18,
    });
  });

  it("parses short alias and single verse", () => {
    expect(parseReference("Jn 3:16")).toEqual({
      bookId: "JHN",
      bookName: "Jean",
      chapter: 3,
      from: 16,
      to: 16,
    });
  });

  it("parses chapter-only references", () => {
    expect(parseReference("Psaume 23")).toEqual({
      bookId: "PSA",
      bookName: "Psaumes",
      chapter: 23,
      from: 1,
      to: 999,
    });
  });

  it("returns null for unknown books", () => {
    expect(parseReference("Genese 1:1")).toBeNull();
  });
});
