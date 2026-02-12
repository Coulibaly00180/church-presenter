import { app, BrowserWindow, ipcMain, screen, dialog } from "electron";
import { join, basename, extname, resolve, sep } from "path";
import fs from "fs";
import { registerSongsIpc } from "./ipc/songs";
import { registerPlansIpc } from "./ipc/plans";
import { registerDataIpc } from "./ipc/data";
import { registerBibleIpc } from "./ipc/bible";
import type {
  CpDevtoolsTarget,
  CpLiveSetPayload,
  CpLiveState,
  CpMediaType,
  CpProjectionMode,
  CpProjectionSetAppearancePayload,
  CpProjectionSetMediaPayload,
  CpProjectionSetTextPayload,
  CpProjectionState,
  CpScreenMeta,
  ScreenKey,
  ScreenMirrorMode,
} from "../shared/ipc";

type ProjectionMode = CpProjectionMode;
type ProjectionState = CpProjectionState;
type ScreenInfo = CpScreenMeta;
type LiveState = CpLiveState;

let regieWin: BrowserWindow | null = null;

// Windows for A/B/C
const projWins: Partial<Record<ScreenKey, BrowserWindow>> = {};

// Per-screen state (A = "main" projection)
const screenStates: Record<ScreenKey, ProjectionState> = {
  A: {
    mode: "NORMAL",
    lowerThirdEnabled: false,
    transitionEnabled: false,
    textScale: 1,
    background: "#050505",
    foreground: "#ffffff",
    current: { kind: "EMPTY" },
    updatedAt: Date.now(),
  },
  B: {
    mode: "NORMAL",
    lowerThirdEnabled: false,
    transitionEnabled: false,
    textScale: 1,
    background: "#050505",
    foreground: "#ffffff",
    current: { kind: "EMPTY" },
    updatedAt: Date.now(),
  },
  C: {
    mode: "NORMAL",
    lowerThirdEnabled: false,
    transitionEnabled: false,
    textScale: 1,
    background: "#050505",
    foreground: "#ffffff",
    current: { kind: "EMPTY" },
    updatedAt: Date.now(),
  },
};

// Mirror config
const mirrors: Record<ScreenKey, ScreenMirrorMode> = {
  A: { kind: "FREE" },
  B: { kind: "MIRROR", from: "A" }, // sensible default
  C: { kind: "MIRROR", from: "A" }, // sensible default
};

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const PDF_EXTENSIONS = new Set([".pdf"]);

function inferMediaType(filePath: string): CpMediaType | null {
  const ext = extname(filePath).toLowerCase();
  if (PDF_EXTENSIONS.has(ext)) return "PDF";
  if (IMAGE_EXTENSIONS.has(ext)) return "IMAGE";
  return null;
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return String(err);
}

function getMediaDir() {
  return join(app.getPath("userData"), "media");
}

function isPathInDir(baseDir: string, candidatePath: string) {
  const base = (resolve(baseDir) + sep).toLowerCase();
  const candidate = resolve(candidatePath).toLowerCase();
  return candidate.startsWith(base);
}

function getPreloadPath() {
  // IMPORTANT: preload CommonJS généré par electron-vite => out/preload/index.cjs en dev
  // En dev, __dirname = .../apps/desktop/out/main
  if (!app.isPackaged) return join(__dirname, "../preload/index.cjs");

  // En prod, on visera pareil (à ajuster lors du packaging si besoin)
  return join(__dirname, "../preload/index.cjs");
}

function sendScreenState(key: ScreenKey) {
  const payload = { key, state: screenStates[key] };
  regieWin?.webContents.send("screens:state", payload);
  projWins[key]?.webContents.send("screens:state", payload);
}

function broadcastAllScreensState() {
  (["A", "B", "C"] as ScreenKey[]).forEach((k) => sendScreenState(k));
}

function applyMirrorsFrom(source: ScreenKey) {
  (["A", "B", "C"] as ScreenKey[]).forEach((k) => {
    const m = mirrors[k];
    if (k === source) return;
    if (m.kind === "MIRROR" && m.from === source) {
      screenStates[k] = { ...screenStates[source], updatedAt: Date.now() };
      sendScreenState(k);
    }
  });
}

function createRegieWindow() {
  const preloadPath = getPreloadPath();

  regieWin = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Régie",
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  regieWin.setMenuBarVisibility(false);

  const base = process.env.ELECTRON_RENDERER_URL;
  if (base) regieWin.loadURL(`${base}/#/regie`);
  else regieWin.loadFile(join(__dirname, "../renderer/index.html"), { hash: "/regie" });

  if (!app.isPackaged) {
    regieWin.webContents.openDevTools({ mode: "detach" });
  }

  regieWin.webContents.on("did-finish-load", () => {
    // push initial states + window state
    broadcastAllScreensState();
    regieWin?.webContents.send("screens:window", { key: "A", isOpen: !!projWins.A });
    regieWin?.webContents.send("screens:window", { key: "B", isOpen: !!projWins.B });
    regieWin?.webContents.send("screens:window", { key: "C", isOpen: !!projWins.C });
  });

  regieWin.on("closed", () => {
    regieWin = null;
    (["A", "B", "C"] as ScreenKey[]).forEach((k) => {
      projWins[k]?.close();
      delete projWins[k];
    });
  });
}

function getTargetWorkAreaForKey(key: ScreenKey) {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const external = displays.find((d) => d.id !== primary.id);

  // A -> external if present; B/C -> primary (windowed) by default
  const target = key === "A" ? (external ?? primary) : primary;
  return target.workArea;
}

function getProjectionUrlForKey(key: ScreenKey) {
  const base = process.env.ELECTRON_RENDERER_URL;
  const hash = `/projection?screen=${key}`;
  if (base) return `${base}/#${hash}`;
  // loadFile uses hash without leading '#'
  return { file: join(__dirname, "../renderer/index.html"), hash };
}

function createScreenWindow(key: ScreenKey) {
  if (projWins[key]) {
    projWins[key]!.show();
    projWins[key]!.focus();
    return;
  }

  const preloadPath = getPreloadPath();
  const wa = getTargetWorkAreaForKey(key);

  const isMain = key === "A";

  const win = new BrowserWindow({
    x: wa.x,
    y: wa.y,
    width: isMain ? wa.width : Math.min(wa.width, 900),
    height: isMain ? wa.height : Math.min(wa.height, 650),
    title: `Projection ${key}`,
    fullscreen: isMain,
    frame: !isMain, // A is clean fullscreen; B/C are windowed with frame
    autoHideMenuBar: true,
    alwaysOnTop: isMain,
    kiosk: isMain,
    show: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // allow file:// media (PDF/images) from renderer served on http(s)
      allowRunningInsecureContent: true,
    },
  });

  win.setMenuBarVisibility(false);

  // Load
  const url = getProjectionUrlForKey(key);
  if (typeof url === "string") {
    win.loadURL(url);
  } else {
    win.loadFile(url.file, { hash: url.hash });
  }

  win.webContents.on("did-finish-load", () => {
    // send initial state for that screen
    sendScreenState(key);
  });

  if (!app.isPackaged && isMain) {
    win.webContents.openDevTools({ mode: "detach" });
  }

  win.on("closed", () => {
    delete projWins[key];
    regieWin?.webContents.send("screens:window", { key, isOpen: false });
  });

  projWins[key] = win;
  regieWin?.webContents.send("screens:window", { key, isOpen: true });
}

function closeScreenWindow(key: ScreenKey) {
  projWins[key]?.close();
}

app.whenReady().then(() => {
  try {
    registerSongsIpc();
  } catch (e) {
    console.error("registerSongsIpc failed", e);
  }

  try {
    registerPlansIpc();
  } catch (e) {
    console.error("registerPlansIpc failed", e);
  }

  try {
    registerDataIpc();
  } catch (e) {
    console.error("registerDataIpc failed", e);
  }

  try {
    registerBibleIpc();
  } catch (e) {
    console.error("registerBibleIpc failed", e);
  }

  try {
    createRegieWindow();
  } catch (e) {
    console.error("createRegieWindow failed", e);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createRegieWindow();
  });
});

app.on("window-all-closed", () => {
  app.quit();
});

// --------------------
// Backward compatible IPC (A only)
// --------------------
ipcMain.handle("projectionWindow:open", () => {
  createScreenWindow("A");
  return { isOpen: !!projWins.A };
});

ipcMain.handle("projectionWindow:close", () => {
  closeScreenWindow("A");
  return { isOpen: !!projWins.A };
});

ipcMain.handle("projectionWindow:isOpen", () => {
  return { isOpen: !!projWins.A };
});

// Devtools opening
ipcMain.handle("devtools:open", (_evt, target: CpDevtoolsTarget) => {
  if (target === "REGIE") regieWin?.webContents.openDevTools({ mode: "detach" });
  if (target === "PROJECTION" || target === "SCREEN_A") projWins.A?.webContents.openDevTools({ mode: "detach" });
  if (target === "SCREEN_B") projWins.B?.webContents.openDevTools({ mode: "detach" });
  if (target === "SCREEN_C") projWins.C?.webContents.openDevTools({ mode: "detach" });
  return { ok: true };
});

ipcMain.handle("files:pickMedia", async () => {
  const res = await dialog.showOpenDialog({
    title: "Choisir un fichier media (image / PDF)",
    filters: [
      { name: "Media", extensions: ["png", "jpg", "jpeg", "gif", "webp", "pdf"] },
      { name: "All", extensions: ["*"] },
    ],
    properties: ["openFile"],
  });
  if (res.canceled || !res.filePaths?.[0]) return { ok: false, canceled: true };
  const p = res.filePaths[0];
  const mediaType = inferMediaType(p);
  if (!mediaType) return { ok: false, error: "Unsupported media extension" };

  const mediaDir = getMediaDir();
  if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
  const target = join(mediaDir, basename(p));
  try {
    fs.copyFileSync(p, target);
    return { ok: true, path: target, mediaType };
  } catch (e) {
    console.error("copy media failed", e);
    return { ok: true, path: p, mediaType };
  }
});

ipcMain.handle("files:listMedia", async () => {
  try {
    const mediaDir = getMediaDir();
    if (!fs.existsSync(mediaDir)) return { ok: true, files: [] };
    const entries = fs.readdirSync(mediaDir);
    const files = entries
      .filter((f) => fs.statSync(join(mediaDir, f)).isFile())
      .map((name): { name: string; path: string; mediaType: CpMediaType } | null => {
        const full = join(mediaDir, name);
        const mediaType = inferMediaType(name);
        if (!mediaType) return null;
        return { name, path: full, mediaType };
      })
      .filter((x): x is { name: string; path: string; mediaType: CpMediaType } => !!x);
    return { ok: true, files };
  } catch (e: unknown) {
    console.error("listMedia failed", e);
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("files:deleteMedia", async (_evt, payload: { path: string }) => {
  try {
    if (!payload?.path) return { ok: false, error: "Missing media path" };
    const mediaDir = getMediaDir();
    if (!isPathInDir(mediaDir, payload.path)) {
      return { ok: false, error: "Path outside media directory" };
    }
    if (fs.existsSync(payload.path)) {
      fs.unlinkSync(payload.path);
    }
    return { ok: true };
  } catch (e: unknown) {
    console.error("deleteMedia failed", e);
    return { ok: false, error: getErrorMessage(e) };
  }
});

// A-only projection state API (legacy)
ipcMain.handle("projection:getState", () => screenStates.A);

ipcMain.handle("projection:setState", (_evt, patch: Partial<ProjectionState>) => {
  if (liveState.lockedScreens.A) return { ok: false, reason: "LOCKED", state: screenStates.A };
  screenStates.A = { ...screenStates.A, ...patch, updatedAt: Date.now() };
  sendScreenState("A");
  applyMirrorsFrom("A");
  return { ok: true, state: screenStates.A };
});

ipcMain.handle("projection:setAppearance", (_evt, patch: CpProjectionSetAppearancePayload) => {
  if (liveState.lockedScreens.A) return { ok: false, reason: "LOCKED", state: screenStates.A };
  screenStates.A = {
    ...screenStates.A,
    textScale: patch.textScale ?? screenStates.A.textScale ?? 1,
    background: patch.background ?? screenStates.A.background ?? "#050505",
    foreground: patch.foreground ?? screenStates.A.foreground ?? "#ffffff",
    updatedAt: Date.now(),
  };
  sendScreenState("A");
  applyMirrorsFrom("A");
  return { ok: true, state: screenStates.A };
});

ipcMain.handle("projection:setContentText", (_evt, payload: CpProjectionSetTextPayload) => {
  if (liveState.lockedScreens.A) return { ok: false, reason: "LOCKED", state: screenStates.A };
  screenStates.A = {
    ...screenStates.A,
    mode: "NORMAL",
    current: { kind: "TEXT", title: payload.title, body: payload.body, metaSong: payload.metaSong },
    updatedAt: Date.now(),
  };
  sendScreenState("A");
  applyMirrorsFrom("A");
  return { ok: true, state: screenStates.A };
});

ipcMain.handle("projection:setContentMedia", (_evt, payload: CpProjectionSetMediaPayload) => {
  if (liveState.lockedScreens.A) return { ok: false, reason: "LOCKED", state: screenStates.A };
  screenStates.A = {
    ...screenStates.A,
    mode: "NORMAL",
    current: { kind: "MEDIA", title: payload.title, mediaPath: payload.mediaPath, mediaType: payload.mediaType },
    updatedAt: Date.now(),
  };
  sendScreenState("A");
  applyMirrorsFrom("A");
  return { ok: true, state: screenStates.A };
});

ipcMain.handle("projection:setMode", (_evt, mode: ProjectionMode) => {
  if (liveState.lockedScreens.A) return { ok: false, reason: "LOCKED", state: screenStates.A };
  screenStates.A = { ...screenStates.A, mode, updatedAt: Date.now() };
  sendScreenState("A");
  applyMirrorsFrom("A");
  return { ok: true, state: screenStates.A };
});

// --------------------
// New IPC: screens (A/B/C)
// --------------------
ipcMain.handle("screens:list", (): ScreenInfo[] => {
  const keys: ScreenKey[] = ["A", "B", "C"];
  return keys.map((k) => ({ key: k, isOpen: !!projWins[k], mirror: mirrors[k] }));
});

ipcMain.handle("screens:isOpen", (_evt, key: ScreenKey) => ({ isOpen: !!projWins[key] }));

ipcMain.handle("screens:open", (_evt, key: ScreenKey) => {
  createScreenWindow(key);
  return { isOpen: !!projWins[key] };
});

ipcMain.handle("screens:close", (_evt, key: ScreenKey) => {
  closeScreenWindow(key);
  return { isOpen: !!projWins[key] };
});

ipcMain.handle("screens:setMirror", (_evt, key: ScreenKey, mirror: ScreenMirrorMode) => {
  mirrors[key] = mirror;
  // If switching to mirror, sync immediately
  if (mirror.kind === "MIRROR") {
    screenStates[key] = { ...screenStates[mirror.from], updatedAt: Date.now() };
    sendScreenState(key);
  }
  // Notify regie
  regieWin?.webContents.send("screens:meta", { key, mirror });
  return { ok: true, mirror };
});

ipcMain.handle("screens:getState", (_evt, key: ScreenKey) => screenStates[key]);

ipcMain.handle("screens:setContentText", (_evt, key: ScreenKey, payload: CpProjectionSetTextPayload) => {
  // If screen is mirroring, ignore direct set (safety)
  if (mirrors[key].kind === "MIRROR") return { ok: false, reason: "MIRROR" };
  if (liveState.lockedScreens[key]) return { ok: false, reason: "LOCKED" };

  screenStates[key] = {
    ...screenStates[key],
    mode: "NORMAL",
    current: { kind: "TEXT", title: payload.title, body: payload.body, metaSong: payload.metaSong },
    updatedAt: Date.now(),
  };
  sendScreenState(key);
  return { ok: true, state: screenStates[key] };
});

ipcMain.handle(
  "screens:setContentMedia",
  (_evt, key: ScreenKey, payload: CpProjectionSetMediaPayload) => {
    if (mirrors[key].kind === "MIRROR") return { ok: false, reason: "MIRROR" };
    if (liveState.lockedScreens[key]) return { ok: false, reason: "LOCKED" };
    screenStates[key] = {
      ...screenStates[key],
      mode: "NORMAL",
      current: { kind: "MEDIA", title: payload.title, mediaPath: payload.mediaPath, mediaType: payload.mediaType },
      updatedAt: Date.now(),
    };
    sendScreenState(key);
    return { ok: true, state: screenStates[key] };
  }
);

ipcMain.handle("screens:setMode", (_evt, key: ScreenKey, mode: ProjectionMode) => {
  // If screen is mirroring, ignore
  if (mirrors[key].kind === "MIRROR") return { ok: false, reason: "MIRROR" };
  if (liveState.lockedScreens[key]) return { ok: false, reason: "LOCKED" };

  screenStates[key] = { ...screenStates[key], mode, updatedAt: Date.now() };
  sendScreenState(key);
  return { ok: true, state: screenStates[key] };
});

// --------------------
// LiveState (central) - sync Regie / Plan / Projection targets
// --------------------

let liveState: LiveState = {
  enabled: false,
  planId: null,
  cursor: 0,
  target: "A",
  black: false,
  white: false,
  lockedScreens: { A: false, B: false, C: false },
  updatedAt: Date.now(),
};

function getAllWindowsForBroadcast(): BrowserWindow[] {
  const wins: BrowserWindow[] = [];
  if (regieWin) wins.push(regieWin);
  (["A", "B", "C"] as ScreenKey[]).forEach((k) => {
    const w = projWins[k];
    if (w) wins.push(w);
  });
  return wins;
}

function broadcastLive() {
  const payload = { ...liveState };
  getAllWindowsForBroadcast().forEach((w) => {
    try {
      w.webContents.send("live:update", payload);
    } catch {
      // ignore
    }
  });
}

function applyLiveProjectionMode() {
  const mode: ProjectionMode = liveState.black ? "BLACK" : liveState.white ? "WHITE" : "NORMAL";
  const key = liveState.target;

  // If locked -> do not touch that projection mode
  if (liveState.lockedScreens[key]) return;

  // If screen is mirroring, ignore direct set (safety)
  if (mirrors[key]?.kind === "MIRROR") return;

  screenStates[key] = { ...screenStates[key], mode, updatedAt: Date.now() };
  sendScreenState(key);
  applyMirrorsFrom(key);
}

function mergeLive(patch: Partial<LiveState>) {
  // mutual exclusion
  const next: LiveState = { ...liveState, ...patch, updatedAt: Date.now() };

  if (patch.black === true) next.white = false;
  if (patch.white === true) next.black = false;

  if (next.cursor < 0) next.cursor = 0;
  if (!next.target) next.target = "A";

  liveState = next;

  // apply to target projection mode
  applyLiveProjectionMode();

  broadcastLive();
  return liveState;
}

ipcMain.handle("live:get", () => ({ ...liveState }));

ipcMain.handle(
  "live:set",
  async (
    _evt,
    payload: CpLiveSetPayload
  ) => {
    const patch: Partial<LiveState> = {};
    if ("planId" in payload) patch.planId = payload.planId ?? null;
    if ("cursor" in payload && typeof payload.cursor === "number") patch.cursor = payload.cursor;
    if ("enabled" in payload && typeof payload.enabled === "boolean") patch.enabled = payload.enabled;
    if ("target" in payload && payload.target) patch.target = payload.target;
    if ("black" in payload && typeof payload.black === "boolean") patch.black = payload.black;
    if ("white" in payload && typeof payload.white === "boolean") patch.white = payload.white;
    return mergeLive(patch);
  }
);

ipcMain.handle("live:toggle", () => mergeLive({ enabled: !liveState.enabled }));

ipcMain.handle("live:next", () => mergeLive({ cursor: (liveState.cursor ?? 0) + 1, enabled: true }));

ipcMain.handle("live:prev", () => mergeLive({ cursor: Math.max((liveState.cursor ?? 0) - 1, 0), enabled: true }));

ipcMain.handle("live:setCursor", (_evt, cursor: number) => mergeLive({ cursor, enabled: true }));

ipcMain.handle("live:setTarget", (_evt, target: ScreenKey) => mergeLive({ target }));

ipcMain.handle("live:toggleBlack", () => mergeLive({ black: !liveState.black, enabled: true }));

ipcMain.handle("live:toggleWhite", () => mergeLive({ white: !liveState.white, enabled: true }));

ipcMain.handle("live:resume", () => mergeLive({ black: false, white: false, enabled: true }));

ipcMain.handle("live:setLocked", (_evt, payload: { key: ScreenKey; locked: boolean }) => {
  const next = { ...liveState.lockedScreens, [payload.key]: payload.locked };
  return mergeLive({ lockedScreens: next });
});
