import { describe, expect, it } from "vitest";
import { resolveProjectionDestination, shouldSkipProjection } from "./routing";

describe("projection routing helpers", () => {
  it("skips projection when target screen is locked", () => {
    expect(shouldSkipProjection("A", { A: true })).toBe(true);
    expect(shouldSkipProjection("B", { A: true })).toBe(false);
  });

  it("routes mirrored B/C to A", () => {
    const mirrorMeta: CpScreenMeta = { key: "B", isOpen: true, mirror: { kind: "MIRROR", from: "A" } };
    expect(resolveProjectionDestination("B", mirrorMeta)).toBe("A");
  });

  it("keeps free screens on their own destination", () => {
    const freeMeta: CpScreenMeta = { key: "C", isOpen: true, mirror: { kind: "FREE" } };
    expect(resolveProjectionDestination("C", freeMeta)).toBe("C");
    expect(resolveProjectionDestination("A")).toBe("A");
  });
});
