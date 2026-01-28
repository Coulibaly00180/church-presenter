import { app, BrowserWindow, ipcMain, screen } from "electron";
import { join } from "path";

type ProjectionMode = "NORMAL" | "BLACK" | "WHITE";

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

let regieWin: BrowserWindow | null = null;
let projWin: BrowserWindow | null = null;

let state: ProjectionState = {
  mode: "NORMAL",
  lowerThirdEnabled: false,
  transitionEnabled: false,
  current: { kind: "EMPTY" },
  updatedAt: Date.now(),
};

function broadcastState() {
  regieWin?.webContents.send("projection:state", state);
  projWin?.webContents.send("projection:state", state);
}

function getPreloadPath() {
  // IMPORTANT: preload CommonJS généré par electron-vite => out/preload/index.cjs en dev
  // En dev, __dirname = .../apps/desktop/out/main
  if (!app.isPackaged) return join(__dirname, "../preload/index.cjs");

  // En prod, on visera pareil (à ajuster lors du packaging si besoin)
  return join(__dirname, "../preload/index.cjs");
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

  regieWin.on("closed", () => {
    regieWin = null;
    if (projWin) {
      projWin.close();
      projWin = null;
    }
  });
}

function createProjectionWindow() {
  console.log("[MAIN] createProjectionWindow() called");

  if (projWin) {
    console.log("[MAIN] projection already open -> focus");
    projWin.show();
    projWin.focus();
    return;
  }

  const preloadPath = getPreloadPath();

  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const external = displays.find((d) => d.id !== primary.id);

  // workArea pour éviter les offsets bizarres
  const target = external ?? primary;
  const wa = target.workArea;

  projWin = new BrowserWindow({
    x: wa.x,
    y: wa.y,
    width: wa.width,
    height: wa.height,
    title: "Projection",
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    alwaysOnTop: true,
    kiosk: true,
    show: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  projWin.setMenuBarVisibility(false);

  projWin.webContents.on("did-finish-load", () => {
    console.log("[MAIN] projection did-finish-load");
    projWin?.webContents.send("projection:state", state);
  });

  projWin.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error("[MAIN] projection did-fail-load", { code, desc, url });
  });

  const base = process.env.ELECTRON_RENDERER_URL;
  if (base) projWin.loadURL(`${base}/#/projection`);
  else projWin.loadFile(join(__dirname, "../renderer/index.html"), { hash: "/projection" });

  projWin.show();
  projWin.focus();

  if (!app.isPackaged) {
    projWin.webContents.openDevTools({ mode: "detach" });
  }

  regieWin?.webContents.send("projection:window", { isOpen: true });

  projWin.on("closed", () => {
    console.log("[MAIN] projection closed");
    projWin = null;
    regieWin?.webContents.send("projection:window", { isOpen: false });
  });
}

function closeProjectionWindow() {
  if (!projWin) return;
  projWin.close();
}

app.whenReady().then(() => {
  createRegieWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createRegieWindow();
  });
});

app.on("window-all-closed", () => {
  app.quit();
});

// IPC - projection window control
ipcMain.handle("projectionWindow:open", () => {
  console.log("[IPC] projectionWindow:open");
  createProjectionWindow();
  return { isOpen: !!projWin };
});

ipcMain.handle("projectionWindow:close", () => {
  console.log("[IPC] projectionWindow:close");
  closeProjectionWindow();
  return { isOpen: !!projWin };
});

ipcMain.handle("projectionWindow:isOpen", () => {
  return { isOpen: !!projWin };
});

// Devtools opening (optional but useful)
ipcMain.handle("devtools:open", (_evt, target: "REGIE" | "PROJECTION") => {
  if (target === "REGIE") regieWin?.webContents.openDevTools({ mode: "detach" });
  if (target === "PROJECTION") projWin?.webContents.openDevTools({ mode: "detach" });
  return { ok: true };
});

// IPC - projection state
ipcMain.handle("projection:getState", () => state);

ipcMain.handle("projection:setState", (_evt, patch: Partial<ProjectionState>) => {
  state = { ...state, ...patch, updatedAt: Date.now() };
  broadcastState();
  return state;
});

ipcMain.handle("projection:setContentText", (_evt, payload: { title?: string; body: string }) => {
  state = {
    ...state,
    mode: "NORMAL",
    current: { kind: "TEXT", title: payload.title, body: payload.body },
    updatedAt: Date.now(),
  };
  broadcastState();
  return state;
});

ipcMain.handle("projection:setMode", (_evt, mode: ProjectionMode) => {
  state = { ...state, mode, updatedAt: Date.now() };
  broadcastState();
  return state;
});
