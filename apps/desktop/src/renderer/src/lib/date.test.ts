import { describe, expect, it } from "vitest";
import { isoToYmd } from "./date";

describe("plan date helpers", () => {
  it("formats Date values in UTC", () => {
    const d = new Date(Date.UTC(2026, 1, 13, 23, 10, 0));
    expect(isoToYmd(d)).toBe("2026-02-13");
  });

  it("extracts ymd from ISO strings", () => {
    expect(isoToYmd("2026-02-13T09:00:00.000Z")).toBe("2026-02-13");
  });

  it("returns empty string on invalid dates", () => {
    expect(isoToYmd("not-a-date")).toBe("");
  });
});
