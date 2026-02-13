import { describe, expect, it } from "vitest";
import { lookupLSG1910 } from "./lookupLSG1910";

describe("lookupLSG1910", () => {
  it("returns expected verses for Jean 3:16-18", () => {
    const result = lookupLSG1910("Jean 3:16-18");
    expect(result).not.toBeNull();
    expect(result?.reference).toBe("Jean 3:16-18");
    expect(result?.verses).toHaveLength(3);
    expect(result?.verses[0]?.verse).toBe(16);
    expect(result?.verses[2]?.verse).toBe(18);
  });

  it("clamps to available verses when requested range exceeds dataset", () => {
    const result = lookupLSG1910("Psaume 23:1-9");
    expect(result).not.toBeNull();
    expect(result?.verses).toHaveLength(3);
    expect(result?.reference).toBe("Psaumes 23:1-3");
  });

  it("returns null for unsupported references", () => {
    expect(lookupLSG1910("Genese 1:1")).toBeNull();
  });
});
