import { app, BrowserWindow, ipcMain, screen, dialog } from "electron";
import { join, basename, dirname, extname } from "path";
import { access, copyFile, readFile, unlink, rename } from "fs/promises";
import { registerSongsIpc } from "./ipc/songs";
import type { RegisterSongsIpcOptions } from "./ipc/songs";
import { registerPlansIpc } from "./ipc/plans";
import { registerDataIpc } from "./ipc/data";
import { registerBibleIpc } from "./ipc/bible";
import { openDevtoolsWithGuard } from "./ipc/devtools";
import { registerSyncIpc, syncBroadcastLive, syncBroadcastScreenState } from "./ipc/syncServer";
import {
  inferLibraryFileKind,
  inferMediaType,
  inferMimeType,
  isPathInDir,
  getErrorMessage,
} from "./ipc/fileUtils";
import {
  createDefaultProjectionState,
  createDefaultLiveState,
  setContentText as _setContentText,
  setContentMedia as _setContentMedia,
  setMode as _setMode,
  setAppearance as _setAppearance,
  setStatePatch as _setStatePatch,
  setMirror as _setMirror,
  mergeLive as _mergeLive,
  type ScreenContext,
} from "./ipc/screenState";
import { ensureRuntimeDatabaseUrl, runSafeMigrationForPackagedRuntime } from "./db";
import {
  parseDevtoolsTarget,
  parseFilesDeleteMediaPayload,
  parseFilesRenameMediaPayload,
  parseLiveCursor,
  parseLiveSetLockedPayload,
  parseLiveSetPayload,
  parseProjectionMode,
  parseProjectionSetAppearancePayload,
  parseProjectionSetMediaPayload,
  parseProjectionSetTextPayload,
  parseProjectionStatePatch,
  parseScreenKey,
  parseScreenMirrorMode,
} from "./ipc/runtimeValidation";
import type {
  CpMediaFile,
  CpLiveState,
  CpProjectionState,
  CpScreenMeta,
  ScreenKey,
  ScreenMirrorMode,
} from "../shared/ipc";
import {
  type SettingsProfileConfig,
  sanitizeShortcutOverrides,
  sanitizePlanTemplates,
  cloneScreenMirrorMode,
  cloneSettingsProfile,
  readAppConfig,
  writeAppConfig,
  readShortcutsConfig,
  writeShortcutsConfig,
  readTemplatesConfig,
  writeTemplatesConfig,
  readFilesConfig,
  writeFilesConfig,
  readProjectionConfig,
  writeProjectionConfig,
  pickProjectionAppearancePrefs,
  writeProfilesState,
  getProfilesSnapshot,
  buildProfileFromRuntime,
  applyProfileToRuntime,
  syncActiveProfileFromRuntime,
  ensureProfilesOnStartup,
  applyActiveProfileOnStartup,
  parseProfileIdPayload,
  parseProfileNamePayload,
  parseProfileRenamePayload,
  migrateLegacySettingsIfNeeded,
} from "./settings";
import {
  ensureLibraryDirs,
  getFolderDiagnostics,
  validateFontFilePath,
  listLibraryFilesInDir,
} from "./library";

type ScreenInfo = CpScreenMeta;

let regieWin: BrowserWindow | null = null;

// Windows for A/B/C
const projWins: Partial<Record<ScreenKey, BrowserWindow>> = {};

// Per-screen state (A = "main" projection)
const screenStates: Record<ScreenKey, CpProjectionState> = {
  A: createDefaultProjectionState(),
  B: createDefaultProjectionState(),
  C: createDefaultProjectionState(),
};

// Mirror config
const mirrors: Record<ScreenKey, ScreenMirrorMode> = {
  A: { kind: "FREE" },
  B: { kind: "MIRROR", from: "A" },
  C: { kind: "MIRROR", from: "A" },
};

function getMediaDir() {
  return join(app.getPath("userData"), "media");
}

async function pathExists(pathToCheck: string) {
  try {
    await access(pathToCheck);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Local wrappers — bind module-level globals to settings/library functions
// ---------------------------------------------------------------------------

function getRuntimeOpts() {
  return {
    screenStates,
    mirrors,
    ensureLibraryDirs,
    writeFilesConfig,
    writeProjectionConfig,
    broadcastAllScreensState: () => broadcastAllScreensState(),
    regieWin,
  };
}

async function getActiveLibraryDirs() {
  const cfg = await readFilesConfig();
  const rootDir = cfg.libraryDir?.trim() || getMediaDir();
  return ensureLibraryDirs(rootDir);
}

async function applyProjectionConfigOnStartup() {
  const cfg = await readProjectionConfig();
  if (!cfg.screens) return;
  (["A", "B", "C"] as ScreenKey[]).forEach((key) => {
    const prefs = cfg.screens?.[key];
    if (!prefs) return;
    screenStates[key] = {
      ...screenStates[key],
      ...prefs,
      updatedAt: Date.now(),
    };
  });
}

async function persistProjectionAppearanceForScreen(key: ScreenKey) {
  const cfg = await readProjectionConfig();
  const screens = { ...(cfg.screens ?? {}) };
  screens[key] = pickProjectionAppearancePrefs(screenStates[key]);
  await writeProjectionConfig({ screens });
  await syncActiveProfileFromRuntime(screenStates, mirrors);
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
  syncBroadcastScreenState(key, screenStates[key]);
}

function broadcastAllScreensState() {
  (["A", "B", "C"] as ScreenKey[]).forEach((k) => sendScreenState(k));
}

function broadcastLive() {
  const payload = { ...screenCtx.liveState };
  getAllWindowsForBroadcast().forEach((w) => {
    try {
      w.webContents.send("live:update", payload);
    } catch {
      // ignore
    }
  });
  syncBroadcastLive(payload);
}

/** Shared context – bridges extracted pure logic to Electron windows */
const screenCtx: ScreenContext = {
  screenStates,
  mirrors,
  liveState: createDefaultLiveState(),
  broadcast: sendScreenState,
  broadcastLive,
};

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
      // Allow file:// URLs for media preview in development (same policy as projection windows).
      webSecurity: app.isPackaged,
      allowRunningInsecureContent: !app.isPackaged,
    },
  });

  regieWin.setMenuBarVisibility(false);

  const base = process.env.ELECTRON_RENDERER_URL;
  if (base) void regieWin.loadURL(`${base}/#/regie`);
  else void regieWin.loadFile(join(__dirname, "../renderer/index.html"), { hash: "/regie" });

  // DevTools auto-open disabled — open manually via Ctrl+Shift+I or devtools:open IPC.
  // if (!app.isPackaged) regieWin.webContents.openDevTools({ mode: "detach" });

  // Forward renderer console messages to the terminal (main process stdout).
  regieWin.webContents.on("console-message", (_evt, level, message, line, sourceId) => {
    const labels = ["[renderer:debug]", "[renderer:log]", "[renderer:warn]", "[renderer:error]"];
    const label = labels[level] ?? "[renderer]";
    const src = sourceId ? ` (${sourceId.split("/").pop() ?? sourceId}:${line})` : "";
    if (level >= 2) {
      console.error(`${label}${src}`, message);
    } else {
      console.log(`${label}${src}`, message);
    }
  });

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
  const allowInsecureMediaInDev = !app.isPackaged;

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
      // Restrict permissive behavior to development only.
      webSecurity: !allowInsecureMediaInDev,
      allowRunningInsecureContent: allowInsecureMediaInDev,
    },
  });

  win.setMenuBarVisibility(false);

  // Load
  const url = getProjectionUrlForKey(key);
  if (typeof url === "string") {
    void win.loadURL(url);
  } else {
    void win.loadFile(url.file, { hash: url.hash });
  }

  win.webContents.on("did-finish-load", () => {
    // send initial state for that screen
    sendScreenState(key);
  });

  // DevTools auto-open disabled — open manually via devtools:open IPC.
  // if (!app.isPackaged && isMain) win.webContents.openDevTools({ mode: "detach" });

  // Forward projection window console messages to the terminal.
  win.webContents.on("console-message", (_evt, level, message, line, sourceId) => {
    const labels = ["[proj:debug]", "[proj:log]", "[proj:warn]", "[proj:error]"];
    const label = (labels[level] ?? "[proj]") + `[${key}]`;
    const src = sourceId ? ` (${sourceId.split("/").pop() ?? sourceId}:${line})` : "";
    if (level >= 2) {
      console.error(`${label}${src}`, message);
    } else {
      console.log(`${label}${src}`, message);
    }
  });

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

void app.whenReady().then(async () => {
  await ensureRuntimeDatabaseUrl();
  await migrateLegacySettingsIfNeeded();
  await applyProjectionConfigOnStartup();
  await applyActiveProfileOnStartup(getRuntimeOpts());

  if (app.isPackaged) {
    try {
      const migrationSummary = await runSafeMigrationForPackagedRuntime();
      console.info(
        "[db:migrate-safe]",
        JSON.stringify({
          status: "ok",
          backupPath: migrationSummary.backupPath,
          appliedCount: migrationSummary.appliedMigrations.length,
          skippedCount: migrationSummary.skippedMigrations.length,
        })
      );
    } catch (e: unknown) {
      const errorMessage = getErrorMessage(e);
      console.error(
        "[db:migrate-safe]",
        JSON.stringify({
          status: "failed",
          error: errorMessage,
        })
      );
      dialog.showErrorBox(
        "Migration base de donnees echouee",
        `Le demarrage est interrompu pour proteger les donnees.\n\nCause: ${errorMessage}\n\nRestaure la sauvegarde puis relance l'application.`
      );
      app.exit(1);
      return;
    }
  }

  try {
    const songsIpcOptions: RegisterSongsIpcOptions = {
      getSongsJsonDir: async () => {
        const dirs = await getActiveLibraryDirs();
        return dirs.songsJsonDir;
      },
    };
    registerSongsIpc(songsIpcOptions);
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
    registerSyncIpc({
      onLiveCommand: async (cmd, data) => {
        switch (cmd) {
          case "live:next": return _mergeLive(screenCtx, { cursor: (screenCtx.liveState.cursor ?? 0) + 1, enabled: true });
          case "live:prev": return _mergeLive(screenCtx, { cursor: Math.max((screenCtx.liveState.cursor ?? 0) - 1, 0), enabled: true });
          case "live:toggle": return _mergeLive(screenCtx, { enabled: !screenCtx.liveState.enabled });
          case "live:toggleBlack": return _mergeLive(screenCtx, { black: !screenCtx.liveState.black, enabled: true });
          case "live:toggleWhite": return _mergeLive(screenCtx, { white: !screenCtx.liveState.white, enabled: true });
          case "live:resume": return _mergeLive(screenCtx, { black: false, white: false, enabled: true });
          case "live:setCursor": {
            const cursor = typeof data === "number" ? data : 0;
            return _mergeLive(screenCtx, { cursor, enabled: true });
          }
          default: return { ...screenCtx.liveState };
        }
      },
      onStatusChanged: (status) => {
        regieWin?.webContents.send("sync:status", status);
      },
    });
  } catch (e) {
    console.error("registerSyncIpc failed", e);
  }

  try {
    createRegieWindow();
  } catch (e) {
    console.error("createRegieWindow failed", e);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createRegieWindow();
  });
}).catch((e: unknown) => {
  console.error("app.whenReady failed", e);
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
ipcMain.handle("devtools:open", (_evt, rawTarget: unknown) => {
  const target = parseDevtoolsTarget(rawTarget);
  return openDevtoolsWithGuard(target, {
    isPackaged: app.isPackaged,
    openers: {
      REGIE: () => regieWin?.webContents.openDevTools({ mode: "detach" }),
      PROJECTION: () => projWins.A?.webContents.openDevTools({ mode: "detach" }),
      SCREEN_A: () => projWins.A?.webContents.openDevTools({ mode: "detach" }),
      SCREEN_B: () => projWins.B?.webContents.openDevTools({ mode: "detach" }),
      SCREEN_C: () => projWins.C?.webContents.openDevTools({ mode: "detach" }),
    },
  });
});

ipcMain.handle("diagnostics:getState", async () => {
  try {
    const dirs = await getActiveLibraryDirs();
    const [root, images, documents, fonts, videos] = await Promise.all([
      getFolderDiagnostics(dirs.rootDir, pathExists),
      getFolderDiagnostics(dirs.imagesDir, pathExists),
      getFolderDiagnostics(dirs.documentsDir, pathExists),
      getFolderDiagnostics(dirs.fontsDir, pathExists),
      getFolderDiagnostics(dirs.videosDir, pathExists),
    ]);

    const screens = (["A", "B", "C"] as ScreenKey[]).map((key) => ({
      key,
      isOpen: !!projWins[key],
      mirror: cloneScreenMirrorMode(mirrors[key]),
      mode: screenStates[key].mode,
      currentKind: screenStates[key].current.kind,
      updatedAt: screenStates[key].updatedAt,
    }));

    return {
      ok: true,
      diagnostics: {
        generatedAt: Date.now(),
        appVersion: app.getVersion(),
        userDataDir: app.getPath("userData"),
        libraryDir: dirs.rootDir,
        screens,
        folders: { root, images, documents, fonts, videos },
      },
    };
  } catch (e: unknown) {
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("settings:getTheme", async () => {
  try {
    const appCfg = await readAppConfig();
    return { ok: true, theme: appCfg.theme };
  } catch (e: unknown) {
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("settings:setTheme", async (_evt, rawTheme: unknown) => {
  try {
    if (rawTheme !== "light" && rawTheme !== "dark") {
      return { ok: false, error: "Invalid theme" };
    }
    await writeAppConfig({ theme: rawTheme });
    return { ok: true, theme: rawTheme };
  } catch (e: unknown) {
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("settings:getShortcuts", async () => {
  try {
    const shortcuts = await readShortcutsConfig();
    return { ok: true, shortcuts };
  } catch (e: unknown) {
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("settings:setShortcuts", async (_evt, rawShortcuts: unknown) => {
  try {
    const shortcuts = sanitizeShortcutOverrides(rawShortcuts);
    await writeShortcutsConfig(shortcuts);
    return { ok: true, shortcuts };
  } catch (e: unknown) {
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("settings:getTemplates", async () => {
  try {
    const templates = await readTemplatesConfig();
    return { ok: true, templates };
  } catch (e: unknown) {
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("settings:setTemplates", async (_evt, rawTemplates: unknown) => {
  try {
    const templates = sanitizePlanTemplates(rawTemplates);
    await writeTemplatesConfig(templates);
    return { ok: true, templates };
  } catch (e: unknown) {
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("settings:getProfiles", async () => {
  try {
    const state = await ensureProfilesOnStartup({ screenStates, mirrors });
    return { ok: true, snapshot: getProfilesSnapshot(state) };
  } catch (e: unknown) {
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("settings:createProfile", async (_evt, rawPayload: unknown) => {
  try {
    const { name } = parseProfileNamePayload(rawPayload);
    const state = await ensureProfilesOnStartup({ screenStates, mirrors });
    const profile = await buildProfileFromRuntime(name, screenStates, mirrors);
    state.entries.push(profile);
    state.activeProfileId = profile.id;
    await writeProfilesState(state);
    return { ok: true, snapshot: getProfilesSnapshot(state), profile: cloneSettingsProfile(profile) };
  } catch (e: unknown) {
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("settings:activateProfile", async (_evt, rawPayload: unknown) => {
  try {
    const { profileId } = parseProfileIdPayload(rawPayload);
    const state = await ensureProfilesOnStartup({ screenStates, mirrors });
    const profile = state.entries.find((entry) => entry.id === profileId);
    if (!profile) return { ok: false, error: "Profile not found" };

    state.activeProfileId = profile.id;
    await writeProfilesState(state);
    await applyProfileToRuntime(profile, getRuntimeOpts());

    return { ok: true, snapshot: getProfilesSnapshot(state), profile: cloneSettingsProfile(profile) };
  } catch (e: unknown) {
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("settings:renameProfile", async (_evt, rawPayload: unknown) => {
  try {
    const { profileId, name } = parseProfileRenamePayload(rawPayload);
    const state = await ensureProfilesOnStartup({ screenStates, mirrors });
    const idx = state.entries.findIndex((entry) => entry.id === profileId);
    if (idx === -1) return { ok: false, error: "Profile not found" };

    const nextProfile: SettingsProfileConfig = {
      ...state.entries[idx],
      name,
      updatedAt: Date.now(),
    };
    state.entries[idx] = nextProfile;
    await writeProfilesState(state);

    return { ok: true, snapshot: getProfilesSnapshot(state), profile: cloneSettingsProfile(nextProfile) };
  } catch (e: unknown) {
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("settings:saveActiveProfile", async () => {
  try {
    const state = await ensureProfilesOnStartup({ screenStates, mirrors });
    if (!state.activeProfileId) return { ok: false, error: "No active profile" };

    const idx = state.entries.findIndex((entry) => entry.id === state.activeProfileId);
    if (idx === -1) return { ok: false, error: "Active profile not found" };

    const updated = await buildProfileFromRuntime(state.entries[idx].name, screenStates, mirrors, state.entries[idx]);
    state.entries[idx] = updated;
    await writeProfilesState(state);

    return { ok: true, snapshot: getProfilesSnapshot(state), profile: cloneSettingsProfile(updated) };
  } catch (e: unknown) {
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("settings:deleteProfile", async (_evt, rawPayload: unknown) => {
  try {
    const { profileId } = parseProfileIdPayload(rawPayload);
    const state = await ensureProfilesOnStartup({ screenStates, mirrors });
    if (state.entries.length <= 1) {
      return { ok: false, error: "At least one profile is required" };
    }

    const idx = state.entries.findIndex((entry) => entry.id === profileId);
    if (idx === -1) return { ok: false, error: "Profile not found" };

    const deletedWasActive = state.activeProfileId === profileId;
    state.entries.splice(idx, 1);
    if (!state.activeProfileId || deletedWasActive) {
      state.activeProfileId = state.entries[0]?.id ?? null;
    }
    await writeProfilesState(state);

    if (deletedWasActive && state.activeProfileId) {
      const active = state.entries.find((entry) => entry.id === state.activeProfileId);
      if (active) await applyProfileToRuntime(active, getRuntimeOpts());
    }

    return { ok: true, snapshot: getProfilesSnapshot(state) };
  } catch (e: unknown) {
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("files:pickMedia", async () => {
  const res = await dialog.showOpenDialog({
    title: "Choisir un fichier media (image / PDF / vidéo)",
    filters: [
      { name: "Media", extensions: ["png", "jpg", "jpeg", "gif", "webp", "pdf", "mp4", "webm", "mov", "avi", "mkv"] },
      { name: "All", extensions: ["*"] },
    ],
    properties: ["openFile"],
  });
  if (res.canceled || !res.filePaths?.[0]) return { ok: false, canceled: true };
  const p = res.filePaths[0];
  const mediaType = inferMediaType(p);
  if (!mediaType) return { ok: false, error: "Unsupported media extension" };

  const dirs = await getActiveLibraryDirs();
  const targetDir = mediaType === "IMAGE" ? dirs.imagesDir : mediaType === "PDF" ? dirs.documentsDir : dirs.videosDir;
  const target = join(targetDir, basename(p));
  try {
    await copyFile(p, target);
    return { ok: true, path: target, mediaType };
  } catch (e) {
    console.error("copy media failed", e);
    return { ok: false, error: "Échec de la copie du fichier média" };
  }
});

ipcMain.handle("files:pickFont", async () => {
  const res = await dialog.showOpenDialog({
    title: "Choisir une police (.ttf/.otf)",
    filters: [
      { name: "Fonts", extensions: ["ttf", "otf"] },
      { name: "All", extensions: ["*"] },
    ],
    properties: ["openFile"],
  });
  if (res.canceled || !res.filePaths?.[0]) return { ok: false, canceled: true };
  const p = res.filePaths[0];
  const kind = inferLibraryFileKind(p);
  if (kind !== "FONT") return { ok: false, error: "Unsupported font extension" };
  const sourceValidation = await validateFontFilePath(p, pathExists);
  if (!sourceValidation.valid) {
    return { ok: false, error: sourceValidation.reason || "Invalid font file" };
  }

  const dirs = await getActiveLibraryDirs();
  const target = join(dirs.fontsDir, basename(p));
  try {
    await copyFile(p, target);
    return { ok: true, path: target };
  } catch (e) {
    console.error("copy font failed", e);
    return { ok: false, error: "Echec de la copie de la police" };
  }
});

ipcMain.handle("files:listMedia", async () => {
  try {
    const dirs = await getActiveLibraryDirs();
    const [imagesFiles, documentFiles, fontFiles, videoFiles, legacyRootFiles] = await Promise.all([
      listLibraryFilesInDir(dirs.imagesDir, "images", pathExists),
      listLibraryFilesInDir(dirs.documentsDir, "documents", pathExists),
      listLibraryFilesInDir(dirs.fontsDir, "fonts", pathExists),
      listLibraryFilesInDir(dirs.videosDir, "videos", pathExists),
      listLibraryFilesInDir(dirs.rootDir, "root", pathExists),
    ]);
    const filesByPath = new Map<string, CpMediaFile>();
    [...imagesFiles, ...documentFiles, ...fontFiles, ...videoFiles, ...legacyRootFiles].forEach((file) => {
      filesByPath.set(file.path, file);
    });
    const files = Array.from(filesByPath.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return { ok: true, rootDir: dirs.rootDir, files };
  } catch (e: unknown) {
    console.error("listMedia failed", e);
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("files:getLibraryDir", async () => {
  try {
    const dirs = await getActiveLibraryDirs();
    return { ok: true, path: dirs.rootDir };
  } catch (e: unknown) {
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("files:chooseLibraryDir", async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: "Choisir le dossier par defaut",
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true };
    const path = result.filePaths[0];
    await ensureLibraryDirs(path);
    await writeFilesConfig({ libraryDir: path });
    await syncActiveProfileFromRuntime(screenStates, mirrors);
    return { ok: true, path };
  } catch (e: unknown) {
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("files:readMedia", async (_evt, rawPayload: unknown) => {
  try {
    const payload = parseFilesDeleteMediaPayload(rawPayload);
    if (!payload?.path) return { ok: false, error: "Missing media path" };
    const dirs = await getActiveLibraryDirs();
    if (!isPathInDir(dirs.rootDir, payload.path)) {
      return { ok: false, error: "Path outside media directory" };
    }
    if (!(await pathExists(payload.path))) {
      return { ok: false, error: "Media file not found" };
    }
    const data = await readFile(payload.path);
    return { ok: true, base64: data.toString("base64"), mimeType: inferMimeType(payload.path) };
  } catch (e: unknown) {
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("files:existsMedia", async (_evt, rawPayload: unknown) => {
  try {
    const payload = parseFilesDeleteMediaPayload(rawPayload);
    if (!payload?.path) return { ok: false, error: "Missing media path" };
    const dirs = await getActiveLibraryDirs();
    if (!isPathInDir(dirs.rootDir, payload.path)) {
      return { ok: false, error: "Path outside media directory" };
    }
    return { ok: true, exists: await pathExists(payload.path) };
  } catch (e: unknown) {
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("files:validateFont", async (_evt, rawPayload: unknown) => {
  try {
    const payload = parseFilesDeleteMediaPayload(rawPayload);
    if (!payload?.path) return { ok: false, error: "Missing media path" };
    const dirs = await getActiveLibraryDirs();
    if (!isPathInDir(dirs.rootDir, payload.path)) {
      return { ok: false, error: "Path outside media directory" };
    }
    const validation = await validateFontFilePath(payload.path, pathExists);
    return {
      ok: true,
      valid: validation.valid,
      reason: validation.reason,
      family: validation.family,
    };
  } catch (e: unknown) {
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("files:renameMedia", async (_evt, rawPayload: unknown) => {
  try {
    const payload = parseFilesRenameMediaPayload(rawPayload);
    if (!payload?.path) return { ok: false, error: "Missing media path" };
    const dirs = await getActiveLibraryDirs();
    if (!isPathInDir(dirs.rootDir, payload.path)) {
      return { ok: false, error: "Path outside media directory" };
    }
    if (!(await pathExists(payload.path))) {
      return { ok: false, error: "Media file not found" };
    }
    const kind = inferLibraryFileKind(payload.path);
    if (!kind) return { ok: false, error: "Unsupported file kind" };

    const requestedName = payload.name.trim();
    if (!requestedName) return { ok: false, error: "Missing destination name" };
    if (requestedName.includes("\\") || requestedName.includes("/")) {
      return { ok: false, error: "Invalid destination name" };
    }

    const currentExt = extname(payload.path).toLowerCase();
    const requestedExt = extname(requestedName).toLowerCase();
    const finalName =
      requestedExt.length === 0
        ? `${requestedName}${currentExt}`
        : requestedExt === currentExt
          ? requestedName
          : "";

    if (!finalName) {
      return { ok: false, error: "Extension must match current file extension" };
    }

    const nextPath = join(dirname(payload.path), finalName);
    if (!isPathInDir(dirs.rootDir, nextPath)) {
      return { ok: false, error: "Path outside media directory" };
    }
    if (nextPath === payload.path) {
      return { ok: true, path: payload.path, name: basename(payload.path) };
    }
    if (await pathExists(nextPath)) {
      return { ok: false, error: "A file with this name already exists" };
    }

    await rename(payload.path, nextPath);
    return { ok: true, path: nextPath, name: basename(nextPath) };
  } catch (e: unknown) {
    return { ok: false, error: getErrorMessage(e) };
  }
});

ipcMain.handle("files:deleteMedia", async (_evt, rawPayload: unknown) => {
  try {
    const payload = parseFilesDeleteMediaPayload(rawPayload);
    if (!payload?.path) return { ok: false, error: "Missing media path" };
    const dirs = await getActiveLibraryDirs();
    if (!isPathInDir(dirs.rootDir, payload.path)) {
      return { ok: false, error: "Path outside media directory" };
    }
    if (await pathExists(payload.path)) {
      await unlink(payload.path);
    }
    return { ok: true };
  } catch (e: unknown) {
    console.error("deleteMedia failed", e);
    return { ok: false, error: getErrorMessage(e) };
  }
});

// A-only projection state API (legacy)
ipcMain.handle("projection:getState", () => screenStates.A);

ipcMain.handle("projection:setState", (_evt, rawPatch: unknown) => {
  const patch = parseProjectionStatePatch(rawPatch);
  return _setStatePatch(screenCtx, "A", patch);
});

ipcMain.handle("projection:setAppearance", async (_evt, rawPatch: unknown) => {
  const patch = parseProjectionSetAppearancePayload(rawPatch);
  const result = _setAppearance(screenCtx, "A", patch);
  if (result.ok) {
    await persistProjectionAppearanceForScreen("A");
  }
  return result;
});

ipcMain.handle("screens:setAppearance", async (_evt, rawKey: unknown, rawPatch: unknown) => {
  const key = parseScreenKey(rawKey, "screens:setAppearance.key");
  const patch = parseProjectionSetAppearancePayload(rawPatch);
  const result = _setAppearance(screenCtx, key, patch);
  if (result.ok) {
    await persistProjectionAppearanceForScreen(key);
  }
  return result;
});

ipcMain.handle("projection:setContentText", (_evt, rawPayload: unknown) => {
  const payload = parseProjectionSetTextPayload(rawPayload);
  return _setContentText(screenCtx, "A", payload);
});

ipcMain.handle("projection:setContentMedia", (_evt, rawPayload: unknown) => {
  const payload = parseProjectionSetMediaPayload(rawPayload);
  return _setContentMedia(screenCtx, "A", payload);
});

ipcMain.handle("projection:setMode", (_evt, rawMode: unknown) => {
  const mode = parseProjectionMode(rawMode, "projection:setMode.mode");
  return _setMode(screenCtx, "A", mode);
});

// --------------------
// New IPC: screens (A/B/C)
// --------------------
ipcMain.handle("screens:list", (): ScreenInfo[] => {
  const keys: ScreenKey[] = ["A", "B", "C"];
  return keys.map((k) => ({ key: k, isOpen: !!projWins[k], mirror: mirrors[k] }));
});

ipcMain.handle("screens:isOpen", (_evt, rawKey: unknown) => {
  const key = parseScreenKey(rawKey, "screens:isOpen.key");
  return { isOpen: !!projWins[key] };
});

ipcMain.handle("screens:open", (_evt, rawKey: unknown) => {
  const key = parseScreenKey(rawKey, "screens:open.key");
  createScreenWindow(key);
  return { isOpen: !!projWins[key] };
});

ipcMain.handle("screens:close", (_evt, rawKey: unknown) => {
  const key = parseScreenKey(rawKey, "screens:close.key");
  closeScreenWindow(key);
  return { isOpen: !!projWins[key] };
});

ipcMain.handle("screens:setMirror", (_evt, rawKey: unknown, rawMirror: unknown) => {
  const key = parseScreenKey(rawKey, "screens:setMirror.key");
  const mirror = parseScreenMirrorMode(rawMirror);
  const result = _setMirror(screenCtx, key, mirror);
  // Notify regie
  regieWin?.webContents.send("screens:meta", { key, mirror });
  void syncActiveProfileFromRuntime(screenStates, mirrors);
  return result;
});

ipcMain.handle("screens:getState", (_evt, rawKey: unknown) => {
  const key = parseScreenKey(rawKey, "screens:getState.key");
  return screenStates[key];
});

ipcMain.handle("screens:setState", (_evt, rawKey: unknown, rawPatch: unknown) => {
  const key = parseScreenKey(rawKey, "screens:setState.key");
  const patch = parseProjectionStatePatch(rawPatch);
  return _setStatePatch(screenCtx, key, patch);
});

ipcMain.handle("screens:setContentText", (_evt, rawKey: unknown, rawPayload: unknown) => {
  const key = parseScreenKey(rawKey, "screens:setContentText.key");
  const payload = parseProjectionSetTextPayload(rawPayload);
  return _setContentText(screenCtx, key, payload);
});

ipcMain.handle("screens:setContentMedia", (_evt, rawKey: unknown, rawPayload: unknown) => {
  const key = parseScreenKey(rawKey, "screens:setContentMedia.key");
  const payload = parseProjectionSetMediaPayload(rawPayload);
  return _setContentMedia(screenCtx, key, payload);
});

ipcMain.handle("screens:setMode", (_evt, rawKey: unknown, rawMode: unknown) => {
  const key = parseScreenKey(rawKey, "screens:setMode.key");
  const mode = parseProjectionMode(rawMode, "screens:setMode.mode");
  return _setMode(screenCtx, key, mode);
});

// --------------------
// LiveState (central) - sync Regie / Plan / Projection targets
// --------------------

function getAllWindowsForBroadcast(): BrowserWindow[] {
  const wins: BrowserWindow[] = [];
  if (regieWin) wins.push(regieWin);
  (["A", "B", "C"] as ScreenKey[]).forEach((k) => {
    const w = projWins[k];
    if (w) wins.push(w);
  });
  return wins;
}

ipcMain.handle("live:get", () => ({ ...screenCtx.liveState }));

ipcMain.handle("live:set", async (_evt, rawPayload: unknown) => {
  const payload = parseLiveSetPayload(rawPayload);
  const patch: Partial<CpLiveState> = {};
  if ("planId" in payload) patch.planId = payload.planId ?? null;
  if ("cursor" in payload && typeof payload.cursor === "number") patch.cursor = payload.cursor;
  if ("enabled" in payload && typeof payload.enabled === "boolean") patch.enabled = payload.enabled;
  if ("target" in payload && payload.target) patch.target = payload.target;
  if ("black" in payload && typeof payload.black === "boolean") patch.black = payload.black;
  if ("white" in payload && typeof payload.white === "boolean") patch.white = payload.white;
  return _mergeLive(screenCtx, patch);
});

ipcMain.handle("live:toggle", () => _mergeLive(screenCtx, { enabled: !screenCtx.liveState.enabled }));

ipcMain.handle("live:next", () => _mergeLive(screenCtx, { cursor: (screenCtx.liveState.cursor ?? 0) + 1, enabled: true }));

ipcMain.handle("live:prev", () => _mergeLive(screenCtx, { cursor: Math.max((screenCtx.liveState.cursor ?? 0) - 1, 0), enabled: true }));

ipcMain.handle("live:setCursor", (_evt, rawCursor: unknown) => {
  const cursor = parseLiveCursor(rawCursor);
  return _mergeLive(screenCtx, { cursor, enabled: true });
});

ipcMain.handle("live:setTarget", (_evt, rawTarget: unknown) => {
  const target = parseScreenKey(rawTarget, "live:setTarget.target");
  return _mergeLive(screenCtx, { target });
});

ipcMain.handle("live:toggleBlack", () => _mergeLive(screenCtx, { black: !screenCtx.liveState.black, enabled: true }));

ipcMain.handle("live:toggleWhite", () => _mergeLive(screenCtx, { white: !screenCtx.liveState.white, enabled: true }));

ipcMain.handle("live:resume", () => _mergeLive(screenCtx, { black: false, white: false, enabled: true }));

ipcMain.handle("live:setLocked", (_evt, rawPayload: unknown) => {
  const payload = parseLiveSetLockedPayload(rawPayload);
  const next = { ...screenCtx.liveState.lockedScreens, [payload.key]: payload.locked };
  return _mergeLive(screenCtx, { lockedScreens: next });
});

// Free mode: projection window forwards arrow keys to regie window
ipcMain.handle("live:freeNavigate", (_evt, rawDir: unknown) => {
  const dir: 1 | -1 = rawDir === 1 ? 1 : -1;
  regieWin?.webContents.send("live:freeNavigate", dir);
});

// Video control: regie sends PLAY/PAUSE, main broadcasts to all projection windows
ipcMain.handle("live:videoControl", (_evt, rawAction: unknown) => {
  const action: "PLAY" | "PAUSE" = rawAction === "PLAY" ? "PLAY" : "PAUSE";
  (["A", "B", "C"] as ScreenKey[]).forEach((k) => {
    projWins[k]?.webContents.send("live:videoControl", action);
  });
});

// Video volume: regie sends 0-1, main broadcasts to all projection windows
ipcMain.handle("live:videoVolume", (_evt, rawVolume: unknown) => {
  const volume = typeof rawVolume === "number" ? Math.max(0, Math.min(1, rawVolume)) : 1;
  (["A", "B", "C"] as ScreenKey[]).forEach((k) => {
    projWins[k]?.webContents.send("live:videoVolume", volume);
  });
});
