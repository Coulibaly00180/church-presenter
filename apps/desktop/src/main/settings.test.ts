import { describe, expect, it, vi } from "vitest";

import { createDefaultProjectionState } from "./ipc/screenState";
import {
  applyProfileToRuntime,
  buildProjectionSnapshotFromRuntime,
  sanitizeProjectionAppearancePrefs,
  type SettingsProfileConfig,
} from "./settings";

describe("settings projection appearance", () => {
  it("preserves logoScale in sanitized prefs and runtime snapshots", () => {
    expect(sanitizeProjectionAppearancePrefs({ logoScale: 140, logoOpacity: 80 })).toEqual({
      logoOpacity: 80,
      logoScale: 140,
    });

    const screenStates = {
      A: { ...createDefaultProjectionState(), logoScale: 140 },
      B: createDefaultProjectionState(),
      C: createDefaultProjectionState(),
    };

    const snapshot = buildProjectionSnapshotFromRuntime(screenStates);
    expect(snapshot.screens?.A?.logoScale).toBe(140);
    expect(snapshot.screens?.B?.logoScale).toBe(100);
  });

  it("restores logoScale when applying a saved profile", async () => {
    const screenStates = {
      A: createDefaultProjectionState(),
      B: createDefaultProjectionState(),
      C: createDefaultProjectionState(),
    };
    const mirrors = {
      A: { kind: "FREE" } as const,
      B: { kind: "MIRROR", from: "A" } as const,
      C: { kind: "MIRROR", from: "A" } as const,
    };
    const ensureLibraryDirs = vi.fn(async () => undefined);
    const writeFilesConfig = vi.fn(async () => undefined);
    const writeProjectionConfig = vi.fn(async () => undefined);
    const broadcastAllScreensState = vi.fn();

    const profile: SettingsProfileConfig = {
      id: "profile-1",
      name: "Principal",
      createdAt: 1,
      updatedAt: 2,
      projection: {
        screens: {
          A: { logoScale: 155, logoOpacity: 60 },
        },
      },
    };

    await applyProfileToRuntime(profile, {
      screenStates,
      mirrors,
      ensureLibraryDirs,
      writeFilesConfig,
      writeProjectionConfig,
      broadcastAllScreensState,
      regieWin: null,
    });

    expect(screenStates.A.logoScale).toBe(155);
    expect(screenStates.A.logoOpacity).toBe(60);
    expect(writeFilesConfig).not.toHaveBeenCalled();
    expect(writeProjectionConfig).toHaveBeenCalledWith({
      screens: expect.objectContaining({
        A: expect.objectContaining({ logoScale: 155, logoOpacity: 60 }),
      }),
    });
    expect(broadcastAllScreensState).toHaveBeenCalledTimes(1);
  });
});
