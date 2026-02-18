import { app, BrowserWindow, ipcMain, screen, dialog } from "electron";
import { join, basename } from "path";
import { access, copyFile, mkdir, readdir, readFile, stat, unlink, writeFile } from "fs/promises";
import { registerSongsIpc } from "./ipc/songs";
import { registerPlansIpc } from "./ipc/plans";
import { registerDataIpc } from "./ipc/data";
import { registerBibleIpc } from "./ipc/bible";
import { openDevtoolsWithGuard } from "./ipc/devtools";
import { registerSyncIpc, syncBroadcastLive, syncBroadcastScreenState } from "./ipc/syncServer";
import { inferLibraryFileKind, inferMediaType, inferMimeType, isPathInDir, getErrorMessage } from "./ipc/fileUtils";
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
  CpKeyBinding,
  CpMediaFile,
  CpPlanTemplate,
  CpTemplateItem,
  CpTheme,
  CpShortcutOverrides,
  CpLiveState,
  CpProjectionState,
  CpScreenMeta,
  ScreenKey,
  ScreenMirrorMode,
} from "../shared/ipc";

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

type FilesConfig = {
  libraryDir?: string;
};

type AppConfig = {
  theme?: CpTheme;
};

type ShortcutsConfig = CpShortcutOverrides;
type TemplatesConfig = CpPlanTemplate[];

type ProjectionAppearancePrefs = {
  textScale?: number;
  background?: string;
  backgroundMode?: CpProjectionState["backgroundMode"];
  backgroundGradientFrom?: string;
  backgroundGradientTo?: string;
  backgroundGradientAngle?: number;
  backgroundImage?: string;
  logoPath?: string;
  foreground?: string;
  foregroundMode?: CpProjectionState["foregroundMode"];
  foregroundGradientFrom?: string;
  foregroundGradientTo?: string;
};

type ProjectionConfig = {
  screens?: Partial<Record<ScreenKey, ProjectionAppearancePrefs>>;
};

type SettingsConfig = {
  version: number;
  app?: AppConfig;
  files?: FilesConfig;
  projection?: ProjectionConfig;
  shortcuts?: ShortcutsConfig;
  templates?: TemplatesConfig;
};

const SETTINGS_VERSION = 1;

function getFilesConfigPath() {
  return join(app.getPath("userData"), "files.config.json");
}

function getProjectionConfigPath() {
  return join(app.getPath("userData"), "projection.config.json");
}

function getSettingsConfigPath() {
  return join(app.getPath("userData"), "settings.json");
}

function sanitizeNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

function sanitizeKeyBinding(value: unknown): CpKeyBinding | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.key !== "string" || rec.key.length === 0) return null;
  const out: CpKeyBinding = { key: rec.key };
  if (typeof rec.ctrlKey === "boolean") out.ctrlKey = rec.ctrlKey;
  if (typeof rec.shiftKey === "boolean") out.shiftKey = rec.shiftKey;
  return out;
}

function sanitizeShortcutOverrides(value: unknown): CpShortcutOverrides {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const rec = value as Record<string, unknown>;
  const out: CpShortcutOverrides = {};
  Object.entries(rec).forEach(([action, rawBindings]) => {
    if (!Array.isArray(rawBindings)) return;
    const bindings = rawBindings.map((entry) => sanitizeKeyBinding(entry)).filter((entry): entry is CpKeyBinding => !!entry);
    if (bindings.length > 0) out[action] = bindings;
  });
  return out;
}

function sanitizeTemplateItem(value: unknown): CpTemplateItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.kind !== "string" || rec.kind.length === 0) return null;
  const out: CpTemplateItem = { kind: rec.kind };
  const title = sanitizeNullableString(rec.title);
  const content = sanitizeNullableString(rec.content);
  const refId = sanitizeNullableString(rec.refId);
  const refSubId = sanitizeNullableString(rec.refSubId);
  const mediaPath = sanitizeNullableString(rec.mediaPath);
  if (title !== undefined) out.title = title;
  if (content !== undefined) out.content = content;
  if (refId !== undefined) out.refId = refId;
  if (refSubId !== undefined) out.refSubId = refSubId;
  if (mediaPath !== undefined) out.mediaPath = mediaPath;
  return out;
}

function sanitizePlanTemplate(value: unknown): CpPlanTemplate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.id !== "string" || rec.id.length === 0) return null;
  if (typeof rec.name !== "string" || rec.name.length === 0) return null;
  if (!Array.isArray(rec.items)) return null;
  if (typeof rec.createdAt !== "string" || rec.createdAt.length === 0) return null;

  const items = rec.items.map((entry) => sanitizeTemplateItem(entry)).filter((entry): entry is CpTemplateItem => !!entry);
  return {
    id: rec.id,
    name: rec.name,
    items,
    createdAt: rec.createdAt,
  };
}

function sanitizePlanTemplates(value: unknown): CpPlanTemplate[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => sanitizePlanTemplate(entry)).filter((entry): entry is CpPlanTemplate => !!entry);
}

async function readSettingsConfig(): Promise<SettingsConfig> {
  const cfgPath = getSettingsConfigPath();
  if (!(await pathExists(cfgPath))) return { version: SETTINGS_VERSION };
  try {
    const raw = await readFile(cfgPath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { version: SETTINGS_VERSION };
    const rec = parsed as Record<string, unknown>;
    const version =
      typeof rec.version === "number" && Number.isFinite(rec.version) ? Math.max(1, Math.trunc(rec.version)) : SETTINGS_VERSION;
    const cfg: SettingsConfig = { version };

    if (rec.app && typeof rec.app === "object" && !Array.isArray(rec.app)) {
      const appRec = rec.app as Record<string, unknown>;
      const theme = appRec.theme;
      if (theme === "light" || theme === "dark") cfg.app = { theme };
    }
    if (rec.files && typeof rec.files === "object" && !Array.isArray(rec.files)) {
      const filesRec = rec.files as Record<string, unknown>;
      if (typeof filesRec.libraryDir === "string") cfg.files = { libraryDir: filesRec.libraryDir };
    }
    if (rec.projection && typeof rec.projection === "object" && !Array.isArray(rec.projection)) {
      const projectionRec = rec.projection as Record<string, unknown>;
      const screensRaw = projectionRec.screens;
      if (screensRaw && typeof screensRaw === "object" && !Array.isArray(screensRaw)) {
        const screensRec = screensRaw as Record<string, unknown>;
        const screens: Partial<Record<ScreenKey, ProjectionAppearancePrefs>> = {};
        (["A", "B", "C"] as ScreenKey[]).forEach((key) => {
          const sanitized = sanitizeProjectionAppearancePrefs(screensRec[key]);
          if (sanitized) screens[key] = sanitized;
        });
        cfg.projection = { screens };
      }
    }
    if (rec.shortcuts && typeof rec.shortcuts === "object" && !Array.isArray(rec.shortcuts)) {
      cfg.shortcuts = sanitizeShortcutOverrides(rec.shortcuts);
    }
    if (Array.isArray(rec.templates)) {
      cfg.templates = sanitizePlanTemplates(rec.templates);
    }
    return cfg;
  } catch {
    return { version: SETTINGS_VERSION };
  }
}

async function writeSettingsConfig(cfg: SettingsConfig) {
  const cfgPath = getSettingsConfigPath();
  await mkdir(join(app.getPath("userData")), { recursive: true });
  await writeFile(cfgPath, JSON.stringify({ ...cfg, version: SETTINGS_VERSION }, null, 2), "utf-8");
}

async function readLegacyFilesConfig(): Promise<FilesConfig> {
  const cfgPath = getFilesConfigPath();
  if (!(await pathExists(cfgPath))) return {};
  try {
    const raw = await readFile(cfgPath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const cfg = parsed as FilesConfig;
    if (cfg.libraryDir && typeof cfg.libraryDir !== "string") return {};
    return cfg;
  } catch {
    return {};
  }
}

async function writeFilesConfig(cfg: FilesConfig) {
  const settings = await readSettingsConfig();
  const next: SettingsConfig = { ...settings, files: { ...cfg } };
  await writeSettingsConfig(next);
}

function sanitizeProjectionAppearancePrefs(value: unknown): ProjectionAppearancePrefs | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  const out: ProjectionAppearancePrefs = {};

  if (typeof rec.textScale === "number" && Number.isFinite(rec.textScale)) out.textScale = rec.textScale;
  if (typeof rec.background === "string") out.background = rec.background;
  if (rec.backgroundMode === "SOLID" || rec.backgroundMode === "GRADIENT_LINEAR" || rec.backgroundMode === "GRADIENT_RADIAL") {
    out.backgroundMode = rec.backgroundMode;
  }
  if (typeof rec.backgroundGradientFrom === "string") out.backgroundGradientFrom = rec.backgroundGradientFrom;
  if (typeof rec.backgroundGradientTo === "string") out.backgroundGradientTo = rec.backgroundGradientTo;
  if (typeof rec.backgroundGradientAngle === "number" && Number.isFinite(rec.backgroundGradientAngle)) {
    out.backgroundGradientAngle = rec.backgroundGradientAngle;
  }
  if (typeof rec.backgroundImage === "string") out.backgroundImage = rec.backgroundImage;
  if (typeof rec.logoPath === "string") out.logoPath = rec.logoPath;
  if (typeof rec.foreground === "string") out.foreground = rec.foreground;
  if (rec.foregroundMode === "SOLID" || rec.foregroundMode === "GRADIENT") out.foregroundMode = rec.foregroundMode;
  if (typeof rec.foregroundGradientFrom === "string") out.foregroundGradientFrom = rec.foregroundGradientFrom;
  if (typeof rec.foregroundGradientTo === "string") out.foregroundGradientTo = rec.foregroundGradientTo;

  return Object.keys(out).length > 0 ? out : null;
}

function pickProjectionAppearancePrefs(state: CpProjectionState): ProjectionAppearancePrefs {
  return {
    textScale: state.textScale,
    background: state.background,
    backgroundMode: state.backgroundMode,
    backgroundGradientFrom: state.backgroundGradientFrom,
    backgroundGradientTo: state.backgroundGradientTo,
    backgroundGradientAngle: state.backgroundGradientAngle,
    backgroundImage: state.backgroundImage,
    logoPath: state.logoPath,
    foreground: state.foreground,
    foregroundMode: state.foregroundMode,
    foregroundGradientFrom: state.foregroundGradientFrom,
    foregroundGradientTo: state.foregroundGradientTo,
  };
}

async function readLegacyProjectionConfig(): Promise<ProjectionConfig> {
  const cfgPath = getProjectionConfigPath();
  if (!(await pathExists(cfgPath))) return {};
  try {
    const raw = await readFile(cfgPath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const rec = parsed as Record<string, unknown>;
    const screensRaw = rec.screens;
    if (!screensRaw || typeof screensRaw !== "object" || Array.isArray(screensRaw)) return {};
    const screensRec = screensRaw as Record<string, unknown>;
    const screens: Partial<Record<ScreenKey, ProjectionAppearancePrefs>> = {};
    (["A", "B", "C"] as ScreenKey[]).forEach((key) => {
      const sanitized = sanitizeProjectionAppearancePrefs(screensRec[key]);
      if (sanitized) screens[key] = sanitized;
    });
    return { screens };
  } catch {
    return {};
  }
}

async function writeProjectionConfig(cfg: ProjectionConfig) {
  const settings = await readSettingsConfig();
  const next: SettingsConfig = { ...settings, projection: { ...cfg } };
  await writeSettingsConfig(next);
}

async function readProjectionConfig(): Promise<ProjectionConfig> {
  const settings = await readSettingsConfig();
  if (settings.projection?.screens && Object.keys(settings.projection.screens).length > 0) {
    return { screens: settings.projection.screens };
  }
  return readLegacyProjectionConfig();
}

async function readFilesConfig(): Promise<FilesConfig> {
  const settings = await readSettingsConfig();
  if (settings.files?.libraryDir) return { libraryDir: settings.files.libraryDir };
  return readLegacyFilesConfig();
}

async function readAppConfig(): Promise<AppConfig> {
  const settings = await readSettingsConfig();
  return settings.app ?? {};
}

async function writeAppConfig(cfg: AppConfig) {
  const settings = await readSettingsConfig();
  const next: SettingsConfig = { ...settings, app: { ...cfg } };
  await writeSettingsConfig(next);
}

async function readShortcutsConfig(): Promise<ShortcutsConfig> {
  const settings = await readSettingsConfig();
  return settings.shortcuts ?? {};
}

async function writeShortcutsConfig(shortcuts: ShortcutsConfig) {
  const settings = await readSettingsConfig();
  const next: SettingsConfig = { ...settings, shortcuts: sanitizeShortcutOverrides(shortcuts) };
  await writeSettingsConfig(next);
}

async function readTemplatesConfig(): Promise<TemplatesConfig> {
  const settings = await readSettingsConfig();
  return settings.templates ?? [];
}

async function writeTemplatesConfig(templates: TemplatesConfig) {
  const settings = await readSettingsConfig();
  const next: SettingsConfig = { ...settings, templates: sanitizePlanTemplates(templates) };
  await writeSettingsConfig(next);
}

async function migrateLegacySettingsIfNeeded() {
  const settings = await readSettingsConfig();
  let changed = false;
  const next: SettingsConfig = { ...settings };

  if (!next.files?.libraryDir) {
    const legacyFiles = await readLegacyFilesConfig();
    if (legacyFiles.libraryDir) {
      next.files = { libraryDir: legacyFiles.libraryDir };
      changed = true;
    }
  }

  if (!next.projection?.screens || Object.keys(next.projection.screens).length === 0) {
    const legacyProjection = await readLegacyProjectionConfig();
    if (legacyProjection.screens && Object.keys(legacyProjection.screens).length > 0) {
      next.projection = { screens: legacyProjection.screens };
      changed = true;
    }
  }

  if (changed || settings.version !== SETTINGS_VERSION) {
    next.version = SETTINGS_VERSION;
    await writeSettingsConfig(next);
  }
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
}

type LibraryDirs = {
  rootDir: string;
  imagesDir: string;
  documentsDir: string;
};

function buildLibraryDirs(rootDir: string): LibraryDirs {
  return {
    rootDir,
    imagesDir: join(rootDir, "images"),
    documentsDir: join(rootDir, "documents"),
  };
}

async function ensureLibraryDirs(rootDir: string): Promise<LibraryDirs> {
  const dirs = buildLibraryDirs(rootDir);
  await mkdir(dirs.rootDir, { recursive: true });
  await mkdir(dirs.imagesDir, { recursive: true });
  await mkdir(dirs.documentsDir, { recursive: true });
  return dirs;
}

async function getActiveLibraryDirs(): Promise<LibraryDirs> {
  const cfg = await readFilesConfig();
  const rootDir = cfg.libraryDir?.trim() || getMediaDir();
  return ensureLibraryDirs(rootDir);
}

async function listLibraryFilesInDir(dirPath: string, folder: "images" | "documents" | "root"): Promise<CpMediaFile[]> {
  if (!(await pathExists(dirPath))) return [];
  const entries = await readdir(dirPath);
  const filesRaw = await Promise.all(
    entries.map(async (name): Promise<CpMediaFile | null> => {
      const full = join(dirPath, name);
      const st = await stat(full);
      if (!st.isFile()) return null;
      const kind = inferLibraryFileKind(name);
      if (!kind) return null;
      return { name, path: full, kind, folder };
    })
  );
  return filesRaw.filter((x): x is CpMediaFile => !!x);
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
    },
  });

  regieWin.setMenuBarVisibility(false);

  const base = process.env.ELECTRON_RENDERER_URL;
  if (base) void regieWin.loadURL(`${base}/#/regie`);
  else void regieWin.loadFile(join(__dirname, "../renderer/index.html"), { hash: "/regie" });

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

void app.whenReady().then(async () => {
  await ensureRuntimeDatabaseUrl();
  await migrateLegacySettingsIfNeeded();
  await applyProjectionConfigOnStartup();

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

  const dirs = await getActiveLibraryDirs();
  const targetDir = mediaType === "IMAGE" ? dirs.imagesDir : dirs.documentsDir;
  const target = join(targetDir, basename(p));
  try {
    await copyFile(p, target);
    return { ok: true, path: target, mediaType };
  } catch (e) {
    console.error("copy media failed", e);
    return { ok: false, error: "Échec de la copie du fichier média" };
  }
});

ipcMain.handle("files:listMedia", async () => {
  try {
    const dirs = await getActiveLibraryDirs();
    const [imagesFiles, documentFiles, legacyRootFiles] = await Promise.all([
      listLibraryFilesInDir(dirs.imagesDir, "images"),
      listLibraryFilesInDir(dirs.documentsDir, "documents"),
      listLibraryFilesInDir(dirs.rootDir, "root"),
    ]);
    const filesByPath = new Map<string, CpMediaFile>();
    [...imagesFiles, ...documentFiles, ...legacyRootFiles].forEach((file) => {
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
  return result;
});

ipcMain.handle("screens:getState", (_evt, rawKey: unknown) => {
  const key = parseScreenKey(rawKey, "screens:getState.key");
  return screenStates[key];
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
