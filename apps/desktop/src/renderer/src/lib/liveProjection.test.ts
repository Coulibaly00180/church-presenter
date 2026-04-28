import { describe, expect, it, vi } from "vitest";
import { ensureReadyForFreeProjection, shouldResetForFreeProjection } from "./liveProjection";

describe("liveProjection", () => {
  it("detects when free projection must reset live state", () => {
    expect(shouldResetForFreeProjection({
      enabled: true,
      planId: "plan-1",
      cursor: 2,
      target: "A",
      black: false,
      white: false,
      lockedScreens: { A: false, B: false, C: false },
      updatedAt: 1,
    })).toBe(true);

    expect(shouldResetForFreeProjection({
      enabled: true,
      planId: null,
      cursor: 0,
      target: "A",
      black: true,
      white: false,
      lockedScreens: { A: false, B: false, C: false },
      updatedAt: 1,
    })).toBe(true);

    expect(shouldResetForFreeProjection({
      enabled: true,
      planId: null,
      cursor: 0,
      target: "A",
      black: false,
      white: false,
      lockedScreens: { A: false, B: false, C: false },
      updatedAt: 1,
    })).toBe(false);
  });

  it("switches plan mode projections into clean free mode", async () => {
    const nextState: CpLiveState = {
      enabled: true,
      planId: null,
      cursor: 0,
      target: "B",
      black: false,
      white: false,
      lockedScreens: { A: false, B: false, C: false },
      updatedAt: 2,
    };

    Object.defineProperty(window, "cp", {
      configurable: true,
      value: {
        live: {
          set: vi.fn(async () => nextState),
        },
      } as unknown as Window["cp"],
    });

    const currentState: CpLiveState = {
      enabled: true,
      planId: "plan-1",
      cursor: 4,
      target: "B",
      black: true,
      white: false,
      lockedScreens: { A: false, B: false, C: false },
      updatedAt: 1,
    };

    const result = await ensureReadyForFreeProjection(currentState);

    expect(window.cp.live.set).toHaveBeenCalledWith({
      enabled: true,
      planId: null,
      cursor: 0,
      black: false,
      white: false,
    });
    expect(result).toBe(nextState);
  });

  it("keeps live state as-is when already in visible free mode", async () => {
    const state: CpLiveState = {
      enabled: true,
      planId: null,
      cursor: 0,
      target: "A",
      black: false,
      white: false,
      lockedScreens: { A: false, B: false, C: false },
      updatedAt: 1,
    };

    Object.defineProperty(window, "cp", {
      configurable: true,
      value: {
        live: {
          set: vi.fn(),
        },
      } as unknown as Window["cp"],
    });

    const result = await ensureReadyForFreeProjection(state);

    expect(window.cp.live.set).not.toHaveBeenCalled();
    expect(result).toBe(state);
  });
});
