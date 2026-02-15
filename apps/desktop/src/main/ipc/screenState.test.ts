import { describe, expect, it, vi } from "vitest";
import {
  createDefaultProjectionState,
  createDefaultLiveState,
  applyMirrorsFrom,
  setContentText,
  setContentMedia,
  setMode,
  setAppearance,
  setMirror,
  mergeLive,
  applyLiveProjectionMode,
  type ScreenContext,
} from "./screenState";
import type { ScreenKey, ScreenMirrorMode, CpLiveState } from "../../shared/ipc";

function createTestContext(overrides?: {
  mirrors?: Partial<Record<ScreenKey, ScreenMirrorMode>>;
  liveState?: Partial<CpLiveState>;
}): ScreenContext {
  return {
    screenStates: {
      A: createDefaultProjectionState(),
      B: createDefaultProjectionState(),
      C: createDefaultProjectionState(),
    },
    mirrors: {
      A: { kind: "FREE" },
      B: { kind: "FREE" },
      C: { kind: "FREE" },
      ...overrides?.mirrors,
    },
    liveState: { ...createDefaultLiveState(), ...overrides?.liveState },
    broadcast: vi.fn(),
    broadcastLive: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// setContentText
// ---------------------------------------------------------------------------

describe("setContentText", () => {
  it("sets text on a free, unlocked screen", () => {
    const ctx = createTestContext();
    const result = setContentText(ctx, "A", { body: "Hello", title: "Title" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.current.kind).toBe("TEXT");
      expect(result.state.current.body).toBe("Hello");
      expect(result.state.mode).toBe("NORMAL");
    }
    expect(ctx.broadcast).toHaveBeenCalledWith("A");
  });

  it("rejects when screen is mirroring", () => {
    const ctx = createTestContext({ mirrors: { B: { kind: "MIRROR", from: "A" } } });
    const result = setContentText(ctx, "B", { body: "Hello" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("MIRROR");
  });

  it("rejects when screen is locked", () => {
    const ctx = createTestContext({ liveState: { lockedScreens: { A: true, B: false, C: false } } });
    const result = setContentText(ctx, "A", { body: "Hello" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("LOCKED");
  });
});

// ---------------------------------------------------------------------------
// setContentMedia
// ---------------------------------------------------------------------------

describe("setContentMedia", () => {
  it("sets media on a free screen", () => {
    const ctx = createTestContext();
    const result = setContentMedia(ctx, "B", { mediaPath: "/img.png", mediaType: "IMAGE", title: "Slide" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.current.kind).toBe("MEDIA");
      expect(result.state.current.mediaPath).toBe("/img.png");
    }
  });

  it("rejects on mirrored screen", () => {
    const ctx = createTestContext({ mirrors: { C: { kind: "MIRROR", from: "A" } } });
    const result = setContentMedia(ctx, "C", { mediaPath: "/f.pdf", mediaType: "PDF" });
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setMode
// ---------------------------------------------------------------------------

describe("setMode", () => {
  it("sets mode on a free screen", () => {
    const ctx = createTestContext();
    const result = setMode(ctx, "A", "BLACK");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.mode).toBe("BLACK");
  });

  it("rejects on locked screen", () => {
    const ctx = createTestContext({ liveState: { lockedScreens: { A: false, B: true, C: false } } });
    const result = setMode(ctx, "B", "WHITE");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("LOCKED");
  });
});

// ---------------------------------------------------------------------------
// setAppearance
// ---------------------------------------------------------------------------

describe("setAppearance", () => {
  it("updates textScale", () => {
    const ctx = createTestContext();
    const result = setAppearance(ctx, "A", { textScale: 1.5 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.textScale).toBe(1.5);
  });

  it("preserves existing values when patch is partial", () => {
    const ctx = createTestContext();
    ctx.screenStates.A.background = "#111111";
    const result = setAppearance(ctx, "A", { textScale: 2 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.textScale).toBe(2);
      expect(result.state.background).toBe("#111111");
    }
  });
});

// ---------------------------------------------------------------------------
// setMirror
// ---------------------------------------------------------------------------

describe("setMirror", () => {
  it("sets mirror mode and syncs state from source", () => {
    const ctx = createTestContext();
    ctx.screenStates.A.current = { kind: "TEXT", body: "Synced", title: "T" };
    const result = setMirror(ctx, "B", { kind: "MIRROR", from: "A" });
    expect(result.ok).toBe(true);
    expect(ctx.screenStates.B.current.kind).toBe("TEXT");
    expect(ctx.broadcast).toHaveBeenCalledWith("B");
  });

  it("switches to FREE without syncing", () => {
    const ctx = createTestContext({ mirrors: { B: { kind: "MIRROR", from: "A" } } });
    const result = setMirror(ctx, "B", { kind: "FREE" });
    expect(result.ok).toBe(true);
    expect(ctx.mirrors.B).toEqual({ kind: "FREE" });
  });
});

// ---------------------------------------------------------------------------
// applyMirrorsFrom
// ---------------------------------------------------------------------------

describe("applyMirrorsFrom", () => {
  it("propagates source state to mirroring screens", () => {
    const ctx = createTestContext({ mirrors: { B: { kind: "MIRROR", from: "A" }, C: { kind: "MIRROR", from: "A" } } });
    ctx.screenStates.A.current = { kind: "TEXT", body: "Propagated" };
    applyMirrorsFrom(ctx, "A");
    expect(ctx.screenStates.B.current.body).toBe("Propagated");
    expect(ctx.screenStates.C.current.body).toBe("Propagated");
    expect(ctx.broadcast).toHaveBeenCalledWith("B");
    expect(ctx.broadcast).toHaveBeenCalledWith("C");
  });

  it("does not affect free screens", () => {
    const ctx = createTestContext();
    const origB = { ...ctx.screenStates.B };
    ctx.screenStates.A.current = { kind: "TEXT", body: "Changed" };
    applyMirrorsFrom(ctx, "A");
    expect(ctx.screenStates.B.current.kind).toBe(origB.current.kind);
    expect(ctx.broadcast).not.toHaveBeenCalled();
  });

  it("does not mirror back to the source screen", () => {
    const ctx = createTestContext({ mirrors: { A: { kind: "MIRROR", from: "A" } } });
    applyMirrorsFrom(ctx, "A");
    // Should not call broadcast for A (source is skipped)
    expect(ctx.broadcast).not.toHaveBeenCalledWith("A");
  });
});

// ---------------------------------------------------------------------------
// mergeLive
// ---------------------------------------------------------------------------

describe("mergeLive", () => {
  it("merges a partial patch into live state", () => {
    const ctx = createTestContext();
    const result = mergeLive(ctx, { enabled: true, cursor: 5 });
    expect(result.enabled).toBe(true);
    expect(result.cursor).toBe(5);
  });

  it("mutual exclusion: black=true disables white", () => {
    const ctx = createTestContext({ liveState: { white: true } });
    const result = mergeLive(ctx, { black: true });
    expect(result.black).toBe(true);
    expect(result.white).toBe(false);
  });

  it("mutual exclusion: white=true disables black", () => {
    const ctx = createTestContext({ liveState: { black: true } });
    const result = mergeLive(ctx, { white: true });
    expect(result.white).toBe(true);
    expect(result.black).toBe(false);
  });

  it("clamps negative cursor to 0", () => {
    const ctx = createTestContext();
    const result = mergeLive(ctx, { cursor: -5 });
    expect(result.cursor).toBe(0);
  });

  it("defaults target to A if empty", () => {
    const ctx = createTestContext();
    const result = mergeLive(ctx, { target: "" as ScreenKey });
    expect(result.target).toBe("A");
  });

  it("calls broadcastLive", () => {
    const ctx = createTestContext();
    mergeLive(ctx, { enabled: true });
    expect(ctx.broadcastLive).toHaveBeenCalled();
  });

  it("toggle: flips enabled", () => {
    const ctx = createTestContext({ liveState: { enabled: false } });
    const r1 = mergeLive(ctx, { enabled: !ctx.liveState.enabled });
    expect(r1.enabled).toBe(true);
    const r2 = mergeLive(ctx, { enabled: !ctx.liveState.enabled });
    expect(r2.enabled).toBe(false);
  });

  it("next: increments cursor and enables", () => {
    const ctx = createTestContext({ liveState: { cursor: 3 } });
    const result = mergeLive(ctx, { cursor: ctx.liveState.cursor + 1, enabled: true });
    expect(result.cursor).toBe(4);
    expect(result.enabled).toBe(true);
  });

  it("prev: decrements cursor but not below 0", () => {
    const ctx = createTestContext({ liveState: { cursor: 0 } });
    const result = mergeLive(ctx, { cursor: Math.max(ctx.liveState.cursor - 1, 0), enabled: true });
    expect(result.cursor).toBe(0);
  });

  it("resume: clears black and white", () => {
    const ctx = createTestContext({ liveState: { black: true, white: false } });
    const result = mergeLive(ctx, { black: false, white: false, enabled: true });
    expect(result.black).toBe(false);
    expect(result.white).toBe(false);
    expect(result.enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// applyLiveProjectionMode
// ---------------------------------------------------------------------------

describe("applyLiveProjectionMode", () => {
  it("applies BLACK mode to target screen", () => {
    const ctx = createTestContext({ liveState: { black: true, target: "A" } });
    applyLiveProjectionMode(ctx);
    expect(ctx.screenStates.A.mode).toBe("BLACK");
    expect(ctx.broadcast).toHaveBeenCalledWith("A");
  });

  it("applies WHITE mode to target screen", () => {
    const ctx = createTestContext({ liveState: { white: true, target: "B" } });
    applyLiveProjectionMode(ctx);
    expect(ctx.screenStates.B.mode).toBe("WHITE");
  });

  it("applies NORMAL when neither black nor white", () => {
    const ctx = createTestContext({ liveState: { target: "C" } });
    ctx.screenStates.C.mode = "BLACK";
    applyLiveProjectionMode(ctx);
    expect(ctx.screenStates.C.mode).toBe("NORMAL");
  });

  it("skips locked screens", () => {
    const ctx = createTestContext({
      liveState: { black: true, target: "A", lockedScreens: { A: true, B: false, C: false } },
    });
    const origMode = ctx.screenStates.A.mode;
    applyLiveProjectionMode(ctx);
    expect(ctx.screenStates.A.mode).toBe(origMode);
    expect(ctx.broadcast).not.toHaveBeenCalled();
  });

  it("skips mirrored target screen", () => {
    const ctx = createTestContext({
      mirrors: { B: { kind: "MIRROR", from: "A" } },
      liveState: { black: true, target: "B" },
    });
    const origMode = ctx.screenStates.B.mode;
    applyLiveProjectionMode(ctx);
    expect(ctx.screenStates.B.mode).toBe(origMode);
    expect(ctx.broadcast).not.toHaveBeenCalled();
  });
});
