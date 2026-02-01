import { app, BrowserWindow, ipcMain, screen } from "electron";
import { join } from "path";
import { registerSongsIpc } from "./ipc/songs";
import { registerPlansIpc } from "./ipc/plans";

type ProjectionMode = "NORMAL" | "BLACK" | "WHITE";
type ScreenKey = "A" | "B" | "C";
type ScreenMirrorMode = { kind: "FREE" } | { kind: "MIRROR"; from: ScreenKey };

type ProjectionState = {
  mode: ProjectionMode;
  lowerThirdEnabled: boolean;
  transitionEnabled: boolean;
  current: {
    kind: "EMPTY" | "TEXT";
    title?: string;
    body?: string;
  };
  updatedAt: number;
};

type ScreenInfo = {
  key: ScreenKey;
  isOpen: boolean;
  mirror: ScreenMirrorMode;
};

let regieWin: BrowserWindow | null = null;

// Windows for A/B/C
const projWins: Partial<Record<ScreenKey, BrowserWindow>> = {};

// Per-screen state (A = "main" projection)
const screenStates: Record<ScreenKey, ProjectionState> = {
  A: {
    mode: "NORMAL",
    lowerThirdEnabled: false,
    transitionEnabled: false,
    current: { kind: "EMPTY" },
    updatedAt: Date.now(),
  },
  B: {
    mode: "NORMAL",
    lowerThirdEnabled: false,
    transitionEnabled: false,
    current: { kind: "EMPTY" },
    updatedAt: Date.now(),
  },
  C: {
    mode: "NORMAL",
    lowerThirdEnabled: false,
    transitionEnabled: false,
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

ipcMain.handle("live:set", async (_evt, payload: { planId?: string | null; cursor?: number; enabled?: boolean; target?: "A" | "B" | "C" }) => {
  regieWin?.webContents.send("live:update", payload);
  return { ok: true };
});

// Devtools opening
ipcMain.handle("devtools:open", (_evt, target: "REGIE" | "PROJECTION" | "SCREEN_A" | "SCREEN_B" | "SCREEN_C") => {
  if (target === "REGIE") regieWin?.webContents.openDevTools({ mode: "detach" });
  if (target === "PROJECTION" || target === "SCREEN_A") projWins.A?.webContents.openDevTools({ mode: "detach" });
  if (target === "SCREEN_B") projWins.B?.webContents.openDevTools({ mode: "detach" });
  if (target === "SCREEN_C") projWins.C?.webContents.openDevTools({ mode: "detach" });
  return { ok: true };
});

// A-only projection state API (legacy)
ipcMain.handle("projection:getState", () => screenStates.A);

ipcMain.handle("projection:setState", (_evt, patch: Partial<ProjectionState>) => {
  screenStates.A = { ...screenStates.A, ...patch, updatedAt: Date.now() };
  sendScreenState("A");
  applyMirrorsFrom("A");
  return screenStates.A;
});

ipcMain.handle("projection:setContentText", (_evt, payload: { title?: string; body: string }) => {
  screenStates.A = {
    ...screenStates.A,
    mode: "NORMAL",
    current: { kind: "TEXT", title: payload.title, body: payload.body },
    updatedAt: Date.now(),
  };
  sendScreenState("A");
  applyMirrorsFrom("A");
  return screenStates.A;
});

ipcMain.handle("projection:setMode", (_evt, mode: ProjectionMode) => {
  screenStates.A = { ...screenStates.A, mode, updatedAt: Date.now() };
  sendScreenState("A");
  applyMirrorsFrom("A");
  return screenStates.A;
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

ipcMain.handle("screens:setContentText", (_evt, key: ScreenKey, payload: { title?: string; body: string }) => {
  // If screen is mirroring, ignore direct set (safety)
  if (mirrors[key].kind === "MIRROR") return { ok: false, reason: "MIRROR" };

  screenStates[key] = {
    ...screenStates[key],
    mode: "NORMAL",
    current: { kind: "TEXT", title: payload.title, body: payload.body },
    updatedAt: Date.now(),
  };
  sendScreenState(key);
  return { ok: true, state: screenStates[key] };
});

ipcMain.handle("screens:setMode", (_evt, key: ScreenKey, mode: ProjectionMode) => {
  // If screen is mirroring, ignore
  if (mirrors[key].kind === "MIRROR") return { ok: false, reason: "MIRROR" };

  screenStates[key] = { ...screenStates[key], mode, updatedAt: Date.now() };
  sendScreenState(key);
  return { ok: true, state: screenStates[key] };
});
