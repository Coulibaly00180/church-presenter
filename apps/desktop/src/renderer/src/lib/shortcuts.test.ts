import { describe, expect, it } from "vitest";
import { matchAction, getBindings } from "./shortcuts";

/** Build a minimal KeyboardEvent for testing without a real DOM event. */
function key(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
}

// ---------------------------------------------------------------------------
// Arrow-key navigation (primary use-case causing user bugs)
// ---------------------------------------------------------------------------

describe("matchAction – arrow keys", () => {
  it("maps ArrowRight to 'next'", () => {
    expect(matchAction(key({ key: "ArrowRight" }))).toBe("next");
  });

  it("maps ArrowLeft to 'prev'", () => {
    expect(matchAction(key({ key: "ArrowLeft" }))).toBe("prev");
  });

  it("does NOT match ArrowLeft when Ctrl is held (no ctrl binding for prev)", () => {
    expect(matchAction(key({ key: "ArrowLeft", ctrlKey: true }))).toBeNull();
  });

  it("does NOT match ArrowRight when Ctrl is held", () => {
    expect(matchAction(key({ key: "ArrowRight", ctrlKey: true }))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Space / letter shortcuts
// ---------------------------------------------------------------------------

describe("matchAction – space and letter shortcuts", () => {
  it("maps Space to 'next'", () => {
    expect(matchAction(key({ key: " " }))).toBe("next");
  });

  it("maps 'q' to 'prev'", () => {
    expect(matchAction(key({ key: "q" }))).toBe("prev");
  });

  it("maps 'd' to 'next'", () => {
    expect(matchAction(key({ key: "d" }))).toBe("next");
  });

  it("maps 'b' to 'toggleBlack'", () => {
    expect(matchAction(key({ key: "b" }))).toBe("toggleBlack");
  });

  it("maps 'w' to 'toggleWhite'", () => {
    expect(matchAction(key({ key: "w" }))).toBe("toggleWhite");
  });

  it("maps 'r' to 'resume'", () => {
    expect(matchAction(key({ key: "r" }))).toBe("resume");
  });

  it("returns null for an unrecognized key", () => {
    expect(matchAction(key({ key: "z" }))).toBeNull();
    expect(matchAction(key({ key: "Enter" }))).toBeNull();
    expect(matchAction(key({ key: "Escape" }))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Ctrl+ shortcuts
// ---------------------------------------------------------------------------

describe("matchAction – Ctrl shortcuts", () => {
  it("maps Ctrl+P to 'toggleProjection'", () => {
    expect(matchAction(key({ key: "p", ctrlKey: true }))).toBe("toggleProjection");
  });

  it("maps Ctrl+P via metaKey (Mac Cmd) to 'toggleProjection'", () => {
    expect(matchAction(key({ key: "p", metaKey: true }))).toBe("toggleProjection");
  });

  it("does NOT match plain 'p' as 'toggleProjection'", () => {
    // 'p' alone is not a registered shortcut
    expect(matchAction(key({ key: "p" }))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Screen target shortcuts
// ---------------------------------------------------------------------------

describe("matchAction – screen targets", () => {
  it("maps '1' to 'targetA'", () => {
    expect(matchAction(key({ key: "1" }))).toBe("targetA");
  });

  it("maps '2' to 'targetB'", () => {
    expect(matchAction(key({ key: "2" }))).toBe("targetB");
  });

  it("maps '3' to 'targetC'", () => {
    expect(matchAction(key({ key: "3" }))).toBe("targetC");
  });
});

// ---------------------------------------------------------------------------
// getBindings
// ---------------------------------------------------------------------------

describe("getBindings defaults", () => {
  it("includes ArrowRight and Space for 'next'", () => {
    const bindings = getBindings("next");
    expect(bindings.some((b) => b.key === "ArrowRight")).toBe(true);
    expect(bindings.some((b) => b.key === " ")).toBe(true);
  });

  it("includes ArrowLeft for 'prev'", () => {
    const bindings = getBindings("prev");
    expect(bindings.some((b) => b.key === "ArrowLeft")).toBe(true);
  });

  it("includes Ctrl+P for 'toggleProjection'", () => {
    const bindings = getBindings("toggleProjection");
    expect(bindings.some((b) => b.key === "p" && b.ctrlKey === true)).toBe(true);
  });

  it("returns empty array for unknown action", () => {
    // TypeScript would prevent this, but good to guard the runtime path
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getBindings("nonexistent" as any)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Navigation cursor arithmetic (pure logic, no IPC)
// ---------------------------------------------------------------------------

describe("navigation cursor arithmetic", () => {
  const clamp = (cursor: number, dir: 1 | -1, total: number) =>
    Math.max(0, Math.min(cursor + dir, total - 1));

  it("advances cursor forward", () => {
    expect(clamp(0, 1, 5)).toBe(1);
    expect(clamp(3, 1, 5)).toBe(4);
  });

  it("clamps at the last item", () => {
    expect(clamp(4, 1, 5)).toBe(4); // already at last
    expect(clamp(5, 1, 5)).toBe(4); // beyond last, clamped
  });

  it("goes backward", () => {
    expect(clamp(3, -1, 5)).toBe(2);
    expect(clamp(1, -1, 5)).toBe(0);
  });

  it("clamps at first item", () => {
    expect(clamp(0, -1, 5)).toBe(0); // already at first
  });

  it("handles single-item plan", () => {
    expect(clamp(0, 1, 1)).toBe(0);
    expect(clamp(0, -1, 1)).toBe(0);
  });
});
