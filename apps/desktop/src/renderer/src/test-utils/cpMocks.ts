import { vi } from "vitest";

export function createProjectionState(overrides?: Partial<CpProjectionState>): CpProjectionState {
  return {
    mode: "NORMAL",
    lowerThirdEnabled: false,
    transitionEnabled: false,
    textScale: 1,
    textFont: "system-ui",
    textFontPath: "",
    background: "#050505",
    backgroundMode: "SOLID",
    backgroundGradientFrom: "#2563eb",
    backgroundGradientTo: "#7c3aed",
    backgroundGradientAngle: 135,
    backgroundImage: "",
    logoPath: "",
    foreground: "#ffffff",
    foregroundMode: "SOLID",
    foregroundGradientFrom: "#ffffff",
    foregroundGradientTo: "#93c5fd",
    current: { kind: "EMPTY" },
    updatedAt: Date.now(),
    ...overrides,
  };
}

export function createLiveState(overrides?: Partial<CpLiveState>): CpLiveState {
  return {
    enabled: true,
    planId: null,
    cursor: 3,
    target: "A",
    black: false,
    white: false,
    lockedScreens: { A: false, B: false, C: false },
    updatedAt: Date.now(),
    ...overrides,
  };
}

export function createCpMock() {
  const projectionState = createProjectionState();
  const liveState = createLiveState();
  const screenStates: Record<ScreenKey, CpProjectionState> = {
    A: createProjectionState({ current: { kind: "TEXT", title: "A title", body: "A body" } }),
    B: createProjectionState({ current: { kind: "TEXT", title: "B title", body: "B body" } }),
    C: createProjectionState({ current: { kind: "MEDIA", title: "C media", mediaType: "PDF", mediaPath: "C:\\media\\doc.pdf" } }),
  };
  const screenMetas: CpScreenMeta[] = [
    { key: "A", isOpen: true, mirror: { kind: "FREE" } },
    { key: "B", isOpen: false, mirror: { kind: "FREE" } },
    { key: "C", isOpen: false, mirror: { kind: "FREE" } },
  ];

  const cp = {
    projection: {
      getState: vi.fn(async () => projectionState),
      onState: vi.fn(() => () => undefined),
      setAppearance: vi.fn(async () => ({ ok: true, state: projectionState })),
      setState: vi.fn(async () => ({ ok: true, state: projectionState })),
      setContentText: vi.fn(async () => ({ ok: true, state: projectionState })),
      setContentMedia: vi.fn(async () => ({ ok: true, state: projectionState })),
      setMode: vi.fn(async () => ({ ok: true, state: projectionState })),
    },
    projectionWindow: {
      open: vi.fn(async () => ({ isOpen: true })),
      close: vi.fn(async () => ({ isOpen: false })),
      isOpen: vi.fn(async () => ({ isOpen: true })),
      onWindowState: vi.fn(() => () => undefined),
    },
    screens: {
      list: vi.fn(async () => screenMetas),
      isOpen: vi.fn(async () => ({ isOpen: true })),
      open: vi.fn(async () => ({ isOpen: true })),
      close: vi.fn(async () => ({ isOpen: false })),
      setMirror: vi.fn(async (key: ScreenKey, mirror: ScreenMirrorMode) => {
        void key;
        return { ok: true, mirror };
      }),
      getState: vi.fn(async (key: ScreenKey) => screenStates[key]),
      setContentText: vi.fn(async (key: ScreenKey) => {
        void key;
        return { ok: true, state: projectionState };
      }),
      setContentMedia: vi.fn(async (key: ScreenKey) => {
        void key;
        return { ok: true, state: projectionState };
      }),
      setMode: vi.fn(async (key: ScreenKey) => {
        void key;
        return { ok: true, state: projectionState };
      }),
      setAppearance: vi.fn(async (key: ScreenKey) => {
        void key;
        return { ok: true, state: projectionState };
      }),
      onState: vi.fn(() => () => undefined),
      onWindowState: vi.fn(() => () => undefined),
    },
    songs: {
      list: vi.fn(async () => []),
      get: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "song", title: "song", blocks: [] })),
      updateMeta: vi.fn(async () => ({ id: "song", title: "song", blocks: [] })),
      replaceBlocks: vi.fn(async () => null),
      delete: vi.fn(async () => ({ ok: true })),
      exportWord: vi.fn(async () => ({ ok: false, canceled: true })),
      importWord: vi.fn(async () => ({ ok: false, canceled: true })),
      importJson: vi.fn(async () => ({ ok: false, canceled: true })),
      importWordBatch: vi.fn(async () => ({ ok: false, canceled: true })),
      importAuto: vi.fn(async () => ({ ok: false, canceled: true })),
    },
    plans: {
      list: vi.fn(async () => []),
      get: vi.fn(async () => null),
      duplicate: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "plan", date: new Date().toISOString(), items: [] })),
      update: vi.fn(async () => ({ ok: true })),
      delete: vi.fn(async () => ({ ok: true })),
      addItem: vi.fn(async () => ({ id: "item", planId: "plan", order: 1, kind: "ANNOUNCEMENT_TEXT" })),
      updateItem: vi.fn(async () => ({ ok: true })),
      removeItem: vi.fn(async () => ({ ok: true })),
      reorder: vi.fn(async () => ({ ok: true })),
      export: vi.fn(async () => ({ ok: false, canceled: true })),
      importFromFile: vi.fn(async () => ({ ok: false, canceled: true })),
    },
    data: {
      exportAll: vi.fn(async () => ({ ok: false, canceled: true })),
      importAll: vi.fn(async () => ({ ok: false, canceled: true })),
    },
    bible: {
      listTranslations: vi.fn(async () => ({ ok: true, data: [] })),
    },
    live: {
      get: vi.fn(async () => liveState),
      set: vi.fn(async () => liveState),
      next: vi.fn(async () => liveState),
      prev: vi.fn(async () => liveState),
      setCursor: vi.fn(async () => liveState),
      setTarget: vi.fn(async () => liveState),
      toggle: vi.fn(async () => liveState),
      toggleBlack: vi.fn(async () => liveState),
      toggleWhite: vi.fn(async () => liveState),
      resume: vi.fn(async () => liveState),
      setLocked: vi.fn(async () => liveState),
      onUpdate: vi.fn(() => () => undefined),
    },
    sync: {
      start: vi.fn(async () => ({ ok: true, port: 19000, addresses: ["127.0.0.1"] })),
      stop: vi.fn(async () => ({ ok: true })),
      status: vi.fn(async () => ({ running: false, port: 19000, clients: 0, addresses: [] })),
      onStatusChange: vi.fn(() => () => undefined),
    },
    devtools: {
      open: vi.fn(async () => ({ ok: true })),
    },
    diagnostics: {
      getState: vi.fn(async () => ({
        ok: true,
        diagnostics: {
          generatedAt: 1000,
          appVersion: "0.0.1-test",
          userDataDir: "C:\\Users\\test\\AppData\\Roaming\\cp",
          libraryDir: "C:\\media",
          screens: [
            { key: "A", isOpen: true, mirror: { kind: "FREE" }, mode: "NORMAL", currentKind: "TEXT", updatedAt: 1000 },
            { key: "B", isOpen: false, mirror: { kind: "MIRROR", from: "A" }, mode: "BLACK", currentKind: "EMPTY", updatedAt: 1000 },
            { key: "C", isOpen: false, mirror: { kind: "FREE" }, mode: "WHITE", currentKind: "MEDIA", updatedAt: 1000 },
          ],
          folders: {
            root: { path: "C:\\media", exists: true, readable: true, writable: true, fileCount: 3 },
            images: { path: "C:\\media\\images", exists: true, readable: true, writable: true, fileCount: 1 },
            documents: { path: "C:\\media\\documents", exists: true, readable: true, writable: true, fileCount: 1 },
            fonts: { path: "C:\\media\\fonts", exists: true, readable: true, writable: true, fileCount: 1 },
          },
        },
      })),
    },
    files: {
      pickMedia: vi.fn(async () => ({ ok: false, canceled: true })),
      pickFont: vi.fn(async () => ({ ok: false, canceled: true })),
      validateFont: vi.fn(async () => ({ ok: true, valid: true, family: "MockFont" })),
      deleteMedia: vi.fn(async () => ({ ok: true })),
      renameMedia: vi.fn(async (payload: { path: string; name: string }) => {
        void payload;
        return { ok: true, path: "C:\\media\\fonts\\renamed.ttf", name: "renamed.ttf" };
      }),
      listMedia: vi.fn(async () => ({
        ok: true,
        rootDir: "C:\\media",
        files: [
          { name: "logo.png", path: "C:\\media\\images\\logo.png", kind: "IMAGE", folder: "images" },
          { name: "myfont.ttf", path: "C:\\media\\fonts\\myfont.ttf", kind: "FONT", folder: "fonts" },
        ],
      })),
      chooseLibraryDir: vi.fn(async () => ({ ok: true, path: "D:\\new-media" })),
      getLibraryDir: vi.fn(async () => ({ ok: true, path: "C:\\media" })),
      readMedia: vi.fn(async () => ({ ok: true, base64: "", mimeType: "image/png" })),
    },
    settings: {
      getTheme: vi.fn(async () => ({ ok: true, theme: "dark" })),
      setTheme: vi.fn(async (theme: CpTheme) => ({ ok: true, theme })),
      getShortcuts: vi.fn(async () => ({ ok: true, shortcuts: {} })),
      setShortcuts: vi.fn(async (shortcuts: CpShortcutOverrides) => ({ ok: true, shortcuts })),
      getTemplates: vi.fn(async () => ({ ok: true, templates: [] })),
      setTemplates: vi.fn(async (templates: CpPlanTemplate[]) => ({ ok: true, templates })),
      getProfiles: vi.fn(async () => ({
        ok: true,
        snapshot: {
          activeProfileId: "p1",
          profiles: [
            {
              id: "p1",
              name: "Assemblee Test",
              files: { libraryDir: "C:\\media" },
              projection: { screens: { A: { background: "#000000" } } },
              mirrors: { B: { kind: "FREE" }, C: { kind: "FREE" } },
              createdAt: 1,
              updatedAt: 1,
            },
          ],
        },
      })),
      createProfile: vi.fn(async ({ name }: { name: string }) => ({
        ok: true,
        snapshot: {
          activeProfileId: "p2",
          profiles: [{ id: "p2", name, createdAt: 2, updatedAt: 2 }],
        },
        profile: { id: "p2", name, createdAt: 2, updatedAt: 2 },
      })),
      activateProfile: vi.fn(async ({ profileId }: { profileId: string }) => ({
        ok: true,
        snapshot: {
          activeProfileId: profileId,
          profiles: [{ id: profileId, name: "Assemblee Test", createdAt: 1, updatedAt: 1 }],
        },
        profile: { id: profileId, name: "Assemblee Test", createdAt: 1, updatedAt: 1 },
      })),
      renameProfile: vi.fn(async ({ profileId, name }: { profileId: string; name: string }) => ({
        ok: true,
        snapshot: {
          activeProfileId: profileId,
          profiles: [{ id: profileId, name, createdAt: 1, updatedAt: 2 }],
        },
        profile: { id: profileId, name, createdAt: 1, updatedAt: 2 },
      })),
      saveActiveProfile: vi.fn(async () => ({
        ok: true,
        snapshot: {
          activeProfileId: "p1",
          profiles: [{ id: "p1", name: "Assemblee Test", createdAt: 1, updatedAt: 2 }],
        },
        profile: { id: "p1", name: "Assemblee Test", createdAt: 1, updatedAt: 2 },
      })),
      deleteProfile: vi.fn(async () => ({
        ok: true,
        snapshot: {
          activeProfileId: "p1",
          profiles: [{ id: "p1", name: "Assemblee Test", createdAt: 1, updatedAt: 2 }],
        },
      })),
    },
  } as unknown as Window["cp"];

  Object.defineProperty(window, "cp", {
    configurable: true,
    value: cp,
  });

  return cp;
}
