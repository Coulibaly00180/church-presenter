import { app } from "electron";
import type { BrowserWindow } from "electron";
import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import type {
  CpKeyBinding,
  CpPlanTemplate,
  CpTemplateItem,
  CpTheme,
  CpShortcutOverrides,
  CpProjectionState,
  ScreenKey,
  ScreenMirrorMode,
} from "../shared/ipc";
import { isCpPlanItemKind } from "../shared/planKinds";

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

export type FilesConfig = {
  libraryDir?: string;
};

export type AppConfig = {
  theme?: CpTheme;
};

export type ShortcutsConfig = CpShortcutOverrides;
export type TemplatesConfig = CpPlanTemplate[];

export type ProjectionAppearancePrefs = {
  textScale?: number;
  titleTextScale?: number;
  textFont?: string;
  textFontPath?: string;
  background?: string;
  backgroundMode?: CpProjectionState["backgroundMode"];
  backgroundGradientFrom?: string;
  backgroundGradientTo?: string;
  backgroundGradientAngle?: number;
  backgroundImage?: string;
  logoPath?: string;
  logoPosition?: CpProjectionState["logoPosition"];
  logoOpacity?: number;
  foreground?: string;
  foregroundMode?: CpProjectionState["foregroundMode"];
  foregroundGradientFrom?: string;
  foregroundGradientTo?: string;
};

export type ProjectionConfig = {
  screens?: Partial<Record<ScreenKey, ProjectionAppearancePrefs>>;
};

export type SettingsProfileConfig = {
  id: string;
  name: string;
  files?: FilesConfig;
  projection?: ProjectionConfig;
  mirrors?: Partial<Record<ScreenKey, ScreenMirrorMode>>;
  createdAt: number;
  updatedAt: number;
};

export type ProfilesConfig = {
  activeProfileId?: string | null;
  entries?: SettingsProfileConfig[];
};

export type SettingsConfig = {
  version: number;
  app?: AppConfig;
  files?: FilesConfig;
  projection?: ProjectionConfig;
  shortcuts?: ShortcutsConfig;
  templates?: TemplatesConfig;
  profiles?: ProfilesConfig;
};

export type ProfilesState = { activeProfileId: string | null; entries: SettingsProfileConfig[] };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SETTINGS_VERSION = 1;

// ---------------------------------------------------------------------------
// Config paths
// ---------------------------------------------------------------------------

export function getFilesConfigPath() {
  return join(app.getPath("userData"), "files.config.json");
}

export function getProjectionConfigPath() {
  return join(app.getPath("userData"), "projection.config.json");
}

export function getSettingsConfigPath() {
  return join(app.getPath("userData"), "settings.json");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function pathExists(pathToCheck: string) {
  try {
    const { access } = await import("fs/promises");
    await access(pathToCheck);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Sanitizers
// ---------------------------------------------------------------------------

export function sanitizeNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

export function sanitizeKeyBinding(value: unknown): CpKeyBinding | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.key !== "string" || rec.key.length === 0) return null;
  const out: CpKeyBinding = { key: rec.key };
  if (typeof rec.ctrlKey === "boolean") out.ctrlKey = rec.ctrlKey;
  if (typeof rec.shiftKey === "boolean") out.shiftKey = rec.shiftKey;
  return out;
}

export function sanitizeShortcutOverrides(value: unknown): CpShortcutOverrides {
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

export function sanitizeTemplateItem(value: unknown): CpTemplateItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  if (!isCpPlanItemKind(rec.kind)) return null;
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

export function sanitizePlanTemplate(value: unknown): CpPlanTemplate | null {
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

export function sanitizePlanTemplates(value: unknown): CpPlanTemplate[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => sanitizePlanTemplate(entry)).filter((entry): entry is CpPlanTemplate => !!entry);
}

export function cloneScreenMirrorMode(mode: ScreenMirrorMode): ScreenMirrorMode {
  return mode.kind === "MIRROR" ? { kind: "MIRROR", from: mode.from } : { kind: "FREE" };
}

export function sanitizeProjectionAppearancePrefs(value: unknown): ProjectionAppearancePrefs | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  const out: ProjectionAppearancePrefs = {};

  if (typeof rec.textScale === "number" && Number.isFinite(rec.textScale)) out.textScale = rec.textScale;
  if (typeof rec.titleTextScale === "number" && Number.isFinite(rec.titleTextScale)) out.titleTextScale = rec.titleTextScale;
  if (typeof rec.textFont === "string") out.textFont = rec.textFont;
  if (typeof rec.textFontPath === "string") out.textFontPath = rec.textFontPath;
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
  if (
    rec.logoPosition === "bottom-right" ||
    rec.logoPosition === "bottom-left" ||
    rec.logoPosition === "top-right" ||
    rec.logoPosition === "top-left" ||
    rec.logoPosition === "center"
  ) {
    out.logoPosition = rec.logoPosition;
  }
  if (typeof rec.logoOpacity === "number" && Number.isFinite(rec.logoOpacity)) out.logoOpacity = rec.logoOpacity;
  if (typeof rec.foreground === "string") out.foreground = rec.foreground;
  if (rec.foregroundMode === "SOLID" || rec.foregroundMode === "GRADIENT") out.foregroundMode = rec.foregroundMode;
  if (typeof rec.foregroundGradientFrom === "string") out.foregroundGradientFrom = rec.foregroundGradientFrom;
  if (typeof rec.foregroundGradientTo === "string") out.foregroundGradientTo = rec.foregroundGradientTo;

  return Object.keys(out).length > 0 ? out : null;
}

export function sanitizeProjectionConfig(value: unknown): ProjectionConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const projectionRec = value as Record<string, unknown>;
  const screensRaw = projectionRec.screens;
  if (!screensRaw || typeof screensRaw !== "object" || Array.isArray(screensRaw)) return null;
  const screensRec = screensRaw as Record<string, unknown>;
  const screens: Partial<Record<ScreenKey, ProjectionAppearancePrefs>> = {};
  (["A", "B", "C"] as ScreenKey[]).forEach((key) => {
    const sanitized = sanitizeProjectionAppearancePrefs(screensRec[key]);
    if (sanitized) screens[key] = sanitized;
  });
  return Object.keys(screens).length > 0 ? { screens } : null;
}

export function sanitizeScreenMirrorMode(value: unknown): ScreenMirrorMode | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  if (rec.kind === "FREE") return { kind: "FREE" };
  if (rec.kind === "MIRROR" && (rec.from === "A" || rec.from === "B" || rec.from === "C")) {
    return { kind: "MIRROR", from: rec.from };
  }
  return null;
}

export function sanitizeMirrorsConfig(value: unknown): Partial<Record<ScreenKey, ScreenMirrorMode>> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const rec = value as Record<string, unknown>;
  const out: Partial<Record<ScreenKey, ScreenMirrorMode>> = {};
  (["A", "B", "C"] as ScreenKey[]).forEach((key) => {
    const mode = sanitizeScreenMirrorMode(rec[key]);
    if (mode) out[key] = mode;
  });
  return Object.keys(out).length > 0 ? out : undefined;
}

export function sanitizeSettingsProfile(value: unknown): SettingsProfileConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.id !== "string" || rec.id.trim().length === 0) return null;
  if (typeof rec.name !== "string" || rec.name.trim().length === 0) return null;

  const now = Date.now();
  const createdAt =
    typeof rec.createdAt === "number" && Number.isFinite(rec.createdAt) ? Math.trunc(rec.createdAt) : now;
  const updatedAt =
    typeof rec.updatedAt === "number" && Number.isFinite(rec.updatedAt) ? Math.trunc(rec.updatedAt) : createdAt;

  const profile: SettingsProfileConfig = {
    id: rec.id.trim(),
    name: rec.name.trim(),
    createdAt,
    updatedAt,
  };

  if (rec.files && typeof rec.files === "object" && !Array.isArray(rec.files)) {
    const filesRec = rec.files as Record<string, unknown>;
    if (typeof filesRec.libraryDir === "string" && filesRec.libraryDir.trim().length > 0) {
      profile.files = { libraryDir: filesRec.libraryDir };
    }
  }

  const projection = sanitizeProjectionConfig(rec.projection);
  if (projection) profile.projection = projection;

  const mirrorsCfg = sanitizeMirrorsConfig(rec.mirrors);
  if (mirrorsCfg) profile.mirrors = mirrorsCfg;

  return profile;
}

export function normalizeProfilesConfig(value?: ProfilesConfig): { activeProfileId: string | null; entries: SettingsProfileConfig[] } {
  const seen = new Set<string>();
  const entries = (value?.entries ?? []).filter((entry) => {
    if (!entry?.id || seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });

  let activeProfileId = value?.activeProfileId ?? null;
  if (activeProfileId && !entries.some((entry) => entry.id === activeProfileId)) {
    activeProfileId = entries[0]?.id ?? null;
  }
  return { activeProfileId, entries };
}

export function sanitizeProfilesConfig(value: unknown): ProfilesConfig | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const rec = value as Record<string, unknown>;
  const entriesRaw = Array.isArray(rec.entries) ? rec.entries : [];
  const entries = entriesRaw.map((entry) => sanitizeSettingsProfile(entry)).filter((entry): entry is SettingsProfileConfig => !!entry);
  const activeRaw = rec.activeProfileId;
  const activeProfileId = activeRaw === null ? null : typeof activeRaw === "string" ? activeRaw : null;
  const normalized = normalizeProfilesConfig({ activeProfileId, entries });
  return { activeProfileId: normalized.activeProfileId, entries: normalized.entries };
}

// ---------------------------------------------------------------------------
// Read / write settings.json
// ---------------------------------------------------------------------------

export async function readSettingsConfig(): Promise<SettingsConfig> {
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
    const projection = sanitizeProjectionConfig(rec.projection);
    if (projection) cfg.projection = projection;
    if (rec.shortcuts && typeof rec.shortcuts === "object" && !Array.isArray(rec.shortcuts)) {
      cfg.shortcuts = sanitizeShortcutOverrides(rec.shortcuts);
    }
    if (Array.isArray(rec.templates)) {
      cfg.templates = sanitizePlanTemplates(rec.templates);
    }
    const profiles = sanitizeProfilesConfig(rec.profiles);
    if (profiles) cfg.profiles = profiles;
    return cfg;
  } catch {
    return { version: SETTINGS_VERSION };
  }
}

// Queue de sérialisation des settings : garantit qu'un seul cycle
// read→patch→write est actif à la fois, évitant les race conditions
// entre modifications concurrentes de settings.json.
let settingsWriteQueue: Promise<void> = Promise.resolve();

export async function writeSettingsConfig(cfg: SettingsConfig) {
  const cfgPath = getSettingsConfigPath();
  await mkdir(join(app.getPath("userData")), { recursive: true });
  await writeFile(cfgPath, JSON.stringify({ ...cfg, version: SETTINGS_VERSION }, null, 2), "utf-8");
}

/**
 * Lit settings.json, applique le patch fourni, puis réécrit — le tout
 * sérialisé dans une queue pour éviter les writes concurrents.
 */
export async function patchSettingsConfig(patcher: (cfg: SettingsConfig) => SettingsConfig | Promise<SettingsConfig>): Promise<void> {
  const run = async () => {
    const current = await readSettingsConfig();
    const next = await patcher(current);
    await writeSettingsConfig(next);
  };
  settingsWriteQueue = settingsWriteQueue.then(run, run);
  await settingsWriteQueue;
}

// ---------------------------------------------------------------------------
// Legacy config files
// ---------------------------------------------------------------------------

export async function readLegacyFilesConfig(): Promise<FilesConfig> {
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

export async function writeFilesConfig(cfg: FilesConfig) {
  await patchSettingsConfig((s) => ({ ...s, files: { ...cfg } }));
}

export async function readLegacyProjectionConfig(): Promise<ProjectionConfig> {
  const cfgPath = getProjectionConfigPath();
  if (!(await pathExists(cfgPath))) return {};
  try {
    const raw = await readFile(cfgPath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    const projection = sanitizeProjectionConfig(parsed);
    return projection ?? {};
  } catch {
    return {};
  }
}

export async function writeProjectionConfig(cfg: ProjectionConfig) {
  await patchSettingsConfig((s) => ({ ...s, projection: { ...cfg } }));
}

export async function readProjectionConfig(): Promise<ProjectionConfig> {
  const settings = await readSettingsConfig();
  if (settings.projection?.screens && Object.keys(settings.projection.screens).length > 0) {
    return { screens: settings.projection.screens };
  }
  return readLegacyProjectionConfig();
}

// ---------------------------------------------------------------------------
// High-level config accessors
// ---------------------------------------------------------------------------

export async function readFilesConfig(): Promise<FilesConfig> {
  const settings = await readSettingsConfig();
  if (settings.files?.libraryDir) return { libraryDir: settings.files.libraryDir };
  return readLegacyFilesConfig();
}

export async function readAppConfig(): Promise<AppConfig> {
  const settings = await readSettingsConfig();
  return settings.app ?? {};
}

export async function writeAppConfig(cfg: AppConfig) {
  await patchSettingsConfig((s) => ({ ...s, app: { ...cfg } }));
}

export async function readShortcutsConfig(): Promise<ShortcutsConfig> {
  const settings = await readSettingsConfig();
  return settings.shortcuts ?? {};
}

export async function writeShortcutsConfig(shortcuts: ShortcutsConfig) {
  await patchSettingsConfig((s) => ({ ...s, shortcuts: sanitizeShortcutOverrides(shortcuts) }));
}

export async function readTemplatesConfig(): Promise<TemplatesConfig> {
  const settings = await readSettingsConfig();
  return settings.templates ?? [];
}

export async function writeTemplatesConfig(templates: TemplatesConfig) {
  await patchSettingsConfig((s) => ({ ...s, templates: sanitizePlanTemplates(templates) }));
}

// ---------------------------------------------------------------------------
// Clone helpers
// ---------------------------------------------------------------------------

export function cloneProjectionConfig(cfg?: ProjectionConfig): ProjectionConfig | undefined {
  if (!cfg?.screens) return undefined;
  const screens: Partial<Record<ScreenKey, ProjectionAppearancePrefs>> = {};
  (["A", "B", "C"] as ScreenKey[]).forEach((key) => {
    const prefs = cfg.screens?.[key];
    if (prefs) screens[key] = { ...prefs };
  });
  return Object.keys(screens).length > 0 ? { screens } : undefined;
}

export function cloneMirrorsConfig(cfg?: Partial<Record<ScreenKey, ScreenMirrorMode>>): Partial<Record<ScreenKey, ScreenMirrorMode>> | undefined {
  if (!cfg) return undefined;
  const out: Partial<Record<ScreenKey, ScreenMirrorMode>> = {};
  (["A", "B", "C"] as ScreenKey[]).forEach((key) => {
    const mode = cfg[key];
    if (mode) out[key] = cloneScreenMirrorMode(mode);
  });
  return Object.keys(out).length > 0 ? out : undefined;
}

export function cloneSettingsProfile(profile: SettingsProfileConfig): SettingsProfileConfig {
  return {
    id: profile.id,
    name: profile.name,
    files: profile.files ? { ...profile.files } : undefined,
    projection: cloneProjectionConfig(profile.projection),
    mirrors: cloneMirrorsConfig(profile.mirrors),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Profiles state
// ---------------------------------------------------------------------------

export let ensureProfilesInFlight: Promise<ProfilesState> | null = null;

export async function readProfilesState(): Promise<ProfilesState> {
  const settings = await readSettingsConfig();
  return normalizeProfilesConfig(settings.profiles);
}

export async function writeProfilesState(state: ProfilesState) {
  const normalized = normalizeProfilesConfig({
    activeProfileId: state.activeProfileId,
    entries: state.entries.map((entry) => cloneSettingsProfile(entry)),
  });
  await patchSettingsConfig((s) => ({
    ...s,
    profiles: {
      activeProfileId: normalized.activeProfileId,
      entries: normalized.entries,
    },
  }));
}

export function getProfilesSnapshot(state: ProfilesState) {
  return {
    activeProfileId: state.activeProfileId,
    profiles: state.entries.map((entry) => cloneSettingsProfile(entry)),
  };
}

// ---------------------------------------------------------------------------
// Projection snapshot helpers (receive runtime state as parameters)
// ---------------------------------------------------------------------------

export function pickProjectionAppearancePrefs(state: CpProjectionState): ProjectionAppearancePrefs {
  return {
    textScale: state.textScale,
    titleTextScale: state.titleTextScale,
    textFont: state.textFont,
    textFontPath: state.textFontPath,
    background: state.background,
    backgroundMode: state.backgroundMode,
    backgroundGradientFrom: state.backgroundGradientFrom,
    backgroundGradientTo: state.backgroundGradientTo,
    backgroundGradientAngle: state.backgroundGradientAngle,
    backgroundImage: state.backgroundImage,
    logoPath: state.logoPath,
    logoPosition: state.logoPosition,
    logoOpacity: state.logoOpacity,
    foreground: state.foreground,
    foregroundMode: state.foregroundMode,
    foregroundGradientFrom: state.foregroundGradientFrom,
    foregroundGradientTo: state.foregroundGradientTo,
  };
}

export function buildProjectionSnapshotFromRuntime(screenStates: Record<ScreenKey, CpProjectionState>): ProjectionConfig {
  const screens: Partial<Record<ScreenKey, ProjectionAppearancePrefs>> = {};
  (["A", "B", "C"] as ScreenKey[]).forEach((key) => {
    screens[key] = pickProjectionAppearancePrefs(screenStates[key]);
  });
  return { screens };
}

export function buildMirrorsSnapshotFromRuntime(mirrors: Record<ScreenKey, ScreenMirrorMode>): Partial<Record<ScreenKey, ScreenMirrorMode>> {
  return {
    A: cloneScreenMirrorMode(mirrors.A),
    B: cloneScreenMirrorMode(mirrors.B),
    C: cloneScreenMirrorMode(mirrors.C),
  };
}

export async function buildProfileFromRuntime(
  name: string,
  screenStates: Record<ScreenKey, CpProjectionState>,
  mirrors: Record<ScreenKey, ScreenMirrorMode>,
  existing?: SettingsProfileConfig,
): Promise<SettingsProfileConfig> {
  const files = await readFilesConfig();
  const now = Date.now();
  return {
    id: existing?.id ?? randomUUID(),
    name,
    files: files.libraryDir ? { libraryDir: files.libraryDir } : undefined,
    projection: buildProjectionSnapshotFromRuntime(screenStates),
    mirrors: buildMirrorsSnapshotFromRuntime(mirrors),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Apply profile to runtime
// ---------------------------------------------------------------------------

export type ApplyProfileToRuntimeOptions = {
  screenStates: Record<ScreenKey, CpProjectionState>;
  mirrors: Record<ScreenKey, ScreenMirrorMode>;
  ensureLibraryDirs: (rootDir: string) => Promise<unknown>;
  writeFilesConfig: (cfg: FilesConfig) => Promise<void>;
  writeProjectionConfig: (cfg: ProjectionConfig) => Promise<void>;
  broadcastAllScreensState: () => void;
  regieWin: BrowserWindow | null;
};

export async function applyProfileToRuntime(profile: SettingsProfileConfig, opts: ApplyProfileToRuntimeOptions) {
  const { screenStates, mirrors, ensureLibraryDirs, broadcastAllScreensState, regieWin } = opts;

  if (profile.files?.libraryDir?.trim()) {
    await ensureLibraryDirs(profile.files.libraryDir);
    await opts.writeFilesConfig({ libraryDir: profile.files.libraryDir });
  }

  const screenPrefs = profile.projection?.screens;
  if (screenPrefs) {
    (["A", "B", "C"] as ScreenKey[]).forEach((key) => {
      const prefs = screenPrefs[key];
      if (!prefs) return;
      screenStates[key] = {
        ...screenStates[key],
        ...prefs,
        updatedAt: Date.now(),
      };
    });
    await opts.writeProjectionConfig(buildProjectionSnapshotFromRuntime(screenStates));
  }

  const mirrorPrefs = profile.mirrors;
  if (mirrorPrefs) {
    (["A", "B", "C"] as ScreenKey[]).forEach((key) => {
      const mode = mirrorPrefs[key];
      if (!mode) return;
      mirrors[key] = cloneScreenMirrorMode(mode);
      regieWin?.webContents.send("screens:meta", { key, mirror: mirrors[key] });
    });
  }

  broadcastAllScreensState();
}

// ---------------------------------------------------------------------------
// Sync active profile from runtime
// ---------------------------------------------------------------------------

export async function syncActiveProfileFromRuntime(
  screenStates: Record<ScreenKey, CpProjectionState>,
  mirrors: Record<ScreenKey, ScreenMirrorMode>,
) {
  const state = await readProfilesState();
  if (!state.activeProfileId) return null;
  const idx = state.entries.findIndex((entry) => entry.id === state.activeProfileId);
  if (idx === -1) return null;

  const current = state.entries[idx];
  const updated = await buildProfileFromRuntime(current.name, screenStates, mirrors, current);

  // Re-read the latest state before writing to avoid dropping concurrent
  // profile changes (create/rename/delete) with stale snapshots.
  const latest = await readProfilesState();
  const latestIdx = latest.entries.findIndex((entry) => entry.id === updated.id);
  if (latestIdx === -1) {
    latest.entries.push(updated);
  } else {
    latest.entries[latestIdx] = updated;
  }
  if (!latest.activeProfileId) {
    latest.activeProfileId = updated.id;
  }
  await writeProfilesState(latest);
  return updated;
}

// ---------------------------------------------------------------------------
// ensureProfilesOnStartup / applyActiveProfileOnStartup
// ---------------------------------------------------------------------------

export type EnsureProfilesOnStartupOptions = {
  screenStates: Record<ScreenKey, CpProjectionState>;
  mirrors: Record<ScreenKey, ScreenMirrorMode>;
};

export async function ensureProfilesOnStartup(opts: EnsureProfilesOnStartupOptions): Promise<ProfilesState> {
  if (ensureProfilesInFlight) return ensureProfilesInFlight;
  ensureProfilesInFlight = (async () => {
    const state = await readProfilesState();
    if (state.entries.length > 0) return state;

    const defaultProfile = await buildProfileFromRuntime("Profil principal", opts.screenStates, opts.mirrors);
    const latest = await readProfilesState();
    if (latest.entries.length > 0) return latest;

    const next: ProfilesState = {
      activeProfileId: defaultProfile.id,
      entries: [defaultProfile],
    };
    await writeProfilesState(next);
    return next;
  })();

  try {
    return await ensureProfilesInFlight;
  } finally {
    ensureProfilesInFlight = null;
  }
}

export type ApplyActiveProfileOnStartupOptions = EnsureProfilesOnStartupOptions & ApplyProfileToRuntimeOptions;

export async function applyActiveProfileOnStartup(opts: ApplyActiveProfileOnStartupOptions) {
  const state = await ensureProfilesOnStartup(opts);
  if (!state.activeProfileId) return;
  const active = state.entries.find((entry) => entry.id === state.activeProfileId);
  if (!active) return;
  await applyProfileToRuntime(active, opts);
}

// ---------------------------------------------------------------------------
// Payload parsers
// ---------------------------------------------------------------------------

export function parseProfileIdPayload(value: unknown): { profileId: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid profile payload");
  }
  const rec = value as Record<string, unknown>;
  if (typeof rec.profileId !== "string" || rec.profileId.trim().length === 0) {
    throw new Error("Invalid profileId");
  }
  return { profileId: rec.profileId.trim() };
}

export function parseProfileNamePayload(value: unknown): { name: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid profile payload");
  }
  const rec = value as Record<string, unknown>;
  if (typeof rec.name !== "string" || rec.name.trim().length === 0) {
    throw new Error("Invalid profile name");
  }
  return { name: rec.name.trim() };
}

export function parseProfileRenamePayload(value: unknown): { profileId: string; name: string } {
  const idPayload = parseProfileIdPayload(value);
  const namePayload = parseProfileNamePayload(value);
  return { profileId: idPayload.profileId, name: namePayload.name };
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

export async function migrateLegacySettingsIfNeeded() {
  await patchSettingsConfig(async (settings) => {
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
    }
    return next;
  });
}
