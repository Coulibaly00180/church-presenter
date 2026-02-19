import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type {
  CpDiagnosticsGetResult,
  CpSettingsGetProfilesResult,
  CpSettingsProfileDeleteResult,
  CpSettingsProfileSaveResult,
} from "../shared/ipc";

type Handler = (...args: unknown[]) => unknown;

const ipcHandlers = new Map<string, Handler>();
const appEventHandlers = new Map<string, Array<() => void>>();
const dialogMock = {
  showOpenDialog: vi.fn(async () => ({ canceled: true, filePaths: [] as string[] })),
  showErrorBox: vi.fn(),
};

let userDataDir = "";

class MockBrowserWindow {
  static windows: MockBrowserWindow[] = [];
  private listeners = new Map<string, Array<() => void>>();
  webContents = {
    on: vi.fn(() => undefined),
    send: vi.fn(() => undefined),
    openDevTools: vi.fn(() => undefined),
  };

  constructor() {
    MockBrowserWindow.windows.push(this);
  }

  static getAllWindows() {
    return [...MockBrowserWindow.windows];
  }

  setMenuBarVisibility() {}
  loadURL() {}
  loadFile() {}
  show() {}
  focus() {}

  on(event: string, cb: () => void) {
    const list = this.listeners.get(event) ?? [];
    list.push(cb);
    this.listeners.set(event, list);
  }

  close() {
    const listeners = this.listeners.get("closed") ?? [];
    listeners.forEach((cb) => cb());
    MockBrowserWindow.windows = MockBrowserWindow.windows.filter((entry) => entry !== this);
  }
}

vi.mock("electron", () => {
  const app = {
    isPackaged: false,
    whenReady: vi.fn(async () => undefined),
    on: vi.fn((event: string, cb: () => void) => {
      const list = appEventHandlers.get(event) ?? [];
      list.push(cb);
      appEventHandlers.set(event, list);
    }),
    getPath: vi.fn((name: string) => {
      void name;
      return userDataDir;
    }),
    getVersion: vi.fn(() => "0.0.1-test"),
    quit: vi.fn(() => undefined),
    exit: vi.fn((code?: number) => {
      void code;
      return undefined;
    }),
  };

  const ipcMain = {
    handle: vi.fn((channel: string, handler: Handler) => {
      ipcHandlers.set(channel, handler);
    }),
  };

  const screen = {
    getAllDisplays: vi.fn(() => [{ id: 1, workArea: { x: 0, y: 0, width: 1280, height: 720 } }]),
    getPrimaryDisplay: vi.fn(() => ({ id: 1, workArea: { x: 0, y: 0, width: 1280, height: 720 } })),
  };

  return {
    app,
    ipcMain,
    BrowserWindow: MockBrowserWindow,
    screen,
    dialog: dialogMock,
  };
});

vi.mock("./ipc/songs", () => ({ registerSongsIpc: vi.fn(() => undefined) }));
vi.mock("./ipc/plans", () => ({ registerPlansIpc: vi.fn(() => undefined) }));
vi.mock("./ipc/data", () => ({ registerDataIpc: vi.fn(() => undefined) }));
vi.mock("./ipc/bible", () => ({ registerBibleIpc: vi.fn(() => undefined) }));
vi.mock("./ipc/devtools", () => ({ openDevtoolsWithGuard: vi.fn(() => ({ ok: true })) }));
vi.mock("./ipc/syncServer", () => ({
  registerSyncIpc: vi.fn(() => undefined),
  syncBroadcastLive: vi.fn(() => undefined),
  syncBroadcastScreenState: vi.fn(() => undefined),
}));
vi.mock("./db", () => ({
  ensureRuntimeDatabaseUrl: vi.fn(async () => undefined),
  runSafeMigrationForPackagedRuntime: vi.fn(async () => ({
    backupPath: "",
    appliedMigrations: [],
    skippedMigrations: [],
  })),
}));

async function waitForHandlers() {
  for (let i = 0; i < 20; i += 1) {
    if (ipcHandlers.has("settings:getProfiles") && ipcHandlers.has("diagnostics:getState")) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("IPC handlers not registered");
}

async function bootMainForTest() {
  userDataDir = mkdtempSync(join(tmpdir(), "cp-main-ipc-test-"));
  ipcHandlers.clear();
  appEventHandlers.clear();
  dialogMock.showOpenDialog.mockClear();
  dialogMock.showErrorBox.mockClear();
  MockBrowserWindow.windows = [];
  vi.resetModules();
  await import("./main");
  await waitForHandlers();
}

async function invokeHandler(channel: string, ...args: unknown[]) {
  const handler = ipcHandlers.get(channel);
  if (!handler) throw new Error(`Missing handler: ${channel}`);
  return handler({}, ...args);
}

beforeAll(async () => {
  await bootMainForTest();
});

afterAll(() => {
  if (userDataDir) {
    rmSync(userDataDir, { recursive: true, force: true });
  }
});

describe("main IPC handlers", () => {
  it("supports profile lifecycle", async () => {
    const initial = (await invokeHandler("settings:getProfiles")) as CpSettingsGetProfilesResult;
    expect(initial.ok).toBe(true);
    if (!initial.ok) throw new Error(initial.error);

    const baseProfilesCount = initial.snapshot.profiles.length;
    expect(baseProfilesCount).toBeGreaterThanOrEqual(1);

    const created = (await invokeHandler("settings:createProfile", { name: "Assemblee A" })) as CpSettingsProfileSaveResult;
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.error);
    const createdId = created.profile.id;
    expect(created.snapshot.activeProfileId).toBe(createdId);

    const renamed = (await invokeHandler("settings:renameProfile", { profileId: createdId, name: "Assemblee B" })) as CpSettingsProfileSaveResult;
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) throw new Error(renamed.error);
    expect(renamed.profile.name).toBe("Assemblee B");

    const activated = (await invokeHandler("settings:activateProfile", {
      profileId: initial.snapshot.profiles[0]!.id,
    })) as CpSettingsProfileSaveResult;
    expect(activated.ok).toBe(true);
    if (!activated.ok) throw new Error(activated.error);
    expect(activated.snapshot.activeProfileId).toBe(initial.snapshot.profiles[0]!.id);

    const saved = (await invokeHandler("settings:saveActiveProfile")) as CpSettingsProfileSaveResult;
    expect(saved.ok).toBe(true);
    if (!saved.ok) throw new Error(saved.error);

    const deleted = (await invokeHandler("settings:deleteProfile", { profileId: createdId })) as CpSettingsProfileDeleteResult;
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) throw new Error(deleted.error);
    expect(deleted.snapshot.profiles.some((entry: { id: string }) => entry.id === createdId)).toBe(false);
  });

  it("returns diagnostics state with screens and folders", async () => {
    const result = (await invokeHandler("diagnostics:getState")) as CpDiagnosticsGetResult;
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);

    expect(result.diagnostics.screens).toHaveLength(3);
    expect(result.diagnostics.screens.map((entry: { key: string }) => entry.key)).toEqual(["A", "B", "C"]);
    expect(result.diagnostics.folders.root.exists).toBe(true);
    expect(result.diagnostics.folders.images.exists).toBe(true);
    expect(result.diagnostics.folders.documents.exists).toBe(true);
    expect(result.diagnostics.folders.fonts.exists).toBe(true);
    expect(typeof result.diagnostics.appVersion).toBe("string");
  });

  it("refuses deleting the last remaining profile", async () => {
    const initial = (await invokeHandler("settings:getProfiles")) as CpSettingsGetProfilesResult;
    expect(initial.ok).toBe(true);
    if (!initial.ok) throw new Error(initial.error);

    const profiles = [...initial.snapshot.profiles];
    // Keep one profile only
    while (profiles.length > 1) {
      const toDelete = profiles.pop();
      if (!toDelete) break;
      const deleted = (await invokeHandler("settings:deleteProfile", { profileId: toDelete.id })) as CpSettingsProfileDeleteResult;
      expect(deleted.ok).toBe(true);
      if (!deleted.ok) throw new Error(deleted.error);
    }

    const remaining = (await invokeHandler("settings:getProfiles")) as CpSettingsGetProfilesResult;
    if (!remaining.ok) throw new Error(remaining.error);
    const last = remaining.snapshot.profiles[0]!;

    const denied = (await invokeHandler("settings:deleteProfile", { profileId: last.id })) as CpSettingsProfileDeleteResult;
    expect(denied.ok).toBe(false);
    if (denied.ok) throw new Error("Expected deletion refusal");
    expect(denied.error).toContain("At least one profile is required");
  });
});
