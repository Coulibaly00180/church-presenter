import type {
  CpDataImportAtomicity,
  CpBackgroundFillMode,
  CpDataImportMode,
  CpDevtoolsTarget,
  CpForegroundFillMode,
  CpLogoPosition,
  CpLiveSetPayload,
  CpMediaType,
  CpPlanAddItemPayload,
  CpPlanCreatePayload,
  CpPlanDuplicatePayload,
  CpPlanExportPayload,
  CpPlanUpdatePayload,
  CpPlanUpdateItemPayload,
  CpPlanRemoveItemPayload,
  CpPlanReorderPayload,
  CpProjectionCurrent,
  CpProjectionMode,
  CpProjectionSetAppearancePayload,
  CpProjectionSetMediaPayload,
  CpProjectionSetTextPayload,
  CpProjectionState,
  CpSongMeta,
  ScreenKey,
  ScreenMirrorMode,
} from "../../shared/ipc";
import { CP_PLAN_ITEM_KIND_VALUES } from "../../shared/planKinds";

type UnknownRecord = Record<string, unknown>;

const SCREEN_KEYS = ["A", "B", "C"] as const;
const PROJECTION_MODES = ["NORMAL", "BLACK", "WHITE"] as const;
const BACKGROUND_FILL_MODES = ["SOLID", "GRADIENT_LINEAR", "GRADIENT_RADIAL"] as const;
const FOREGROUND_FILL_MODES = ["SOLID", "GRADIENT"] as const;
const LOGO_POSITIONS = ["bottom-right", "bottom-left", "top-right", "top-left", "center"] as const;
const MEDIA_TYPES = ["IMAGE", "PDF", "VIDEO"] as const;
const DEVTOOLS_TARGETS = ["REGIE", "PROJECTION", "SCREEN_A", "SCREEN_B", "SCREEN_C"] as const;
const DATA_IMPORT_MODES = ["MERGE", "REPLACE"] as const;
const DATA_IMPORT_ATOMICITY = ["ENTITY", "STRICT"] as const;
const SCREEN_MIRROR_MODES = ["FREE", "MIRROR"] as const;
const CURRENT_KINDS = ["EMPTY", "TEXT", "MEDIA"] as const;

function typeOf(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function invalid(message: string): never {
  throw new Error(`Invalid payload: ${message}`);
}

function expectRecord(value: unknown, label: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalid(`${label} must be an object`);
  }
  return value as UnknownRecord;
}

function expectArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    invalid(`${label} must be an array`);
  }
  return value;
}

function expectString(
  value: unknown,
  label: string,
  options?: { trim?: boolean; allowEmpty?: boolean }
): string {
  if (typeof value !== "string") {
    invalid(`${label} must be a string (got ${typeOf(value)})`);
  }
  const trimmed = options?.trim === false ? value : value.trim();
  if (!options?.allowEmpty && trimmed.length === 0) {
    invalid(`${label} must not be empty`);
  }
  return trimmed;
}

function expectOptionalString(
  value: unknown,
  label: string,
  options?: { trim?: boolean; allowEmpty?: boolean; emptyAsUndefined?: boolean }
): string | undefined {
  if (value == null) return undefined;
  const str = expectString(value, label, { trim: options?.trim, allowEmpty: true });
  if (str.length > 0) return str;
  if (options?.allowEmpty) return str;
  if (options?.emptyAsUndefined !== false) return undefined;
  invalid(`${label} must not be empty`);
}

function expectBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    invalid(`${label} must be a boolean`);
  }
  return value;
}

function expectNumber(
  value: unknown,
  label: string,
  options?: { integer?: boolean; min?: number; max?: number }
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    invalid(`${label} must be a finite number`);
  }
  if (options?.integer && !Number.isInteger(value)) {
    invalid(`${label} must be an integer`);
  }
  if (options?.min != null && value < options.min) {
    invalid(`${label} must be >= ${options.min}`);
  }
  if (options?.max != null && value > options.max) {
    invalid(`${label} must be <= ${options.max}`);
  }
  return value;
}

function expectEnum<T extends readonly string[]>(value: unknown, label: string, allowed: T): T[number] {
  const parsed = expectString(value, label);
  if (!(allowed as readonly string[]).includes(parsed)) {
    invalid(`${label} must be one of: ${allowed.join(", ")}`);
  }
  return parsed as T[number];
}

function parseSongMeta(value: unknown, label: string): CpSongMeta | undefined {
  if (value == null) return undefined;
  const rec = expectRecord(value, label);
  return {
    title: expectOptionalString(rec.title, `${label}.title`),
    artist: expectOptionalString(rec.artist, `${label}.artist`),
    album: expectOptionalString(rec.album, `${label}.album`),
    year: expectOptionalString(rec.year, `${label}.year`),
  };
}

function parseProjectionCurrent(value: unknown, label: string): CpProjectionCurrent {
  const rec = expectRecord(value, label);
  const kind = expectEnum(rec.kind, `${label}.kind`, CURRENT_KINDS);

  return {
    kind,
    title: expectOptionalString(rec.title, `${label}.title`, { trim: false, allowEmpty: true }),
    body: expectOptionalString(rec.body, `${label}.body`, { trim: false, allowEmpty: true }),
    mediaPath: expectOptionalString(rec.mediaPath, `${label}.mediaPath`),
    mediaType: rec.mediaType == null ? undefined : expectEnum(rec.mediaType, `${label}.mediaType`, MEDIA_TYPES),
    metaSong: parseSongMeta(rec.metaSong, `${label}.metaSong`),
  };
}

export function parseNonEmptyString(value: unknown, label: string): string {
  return expectString(value, label);
}

export function parseOptionalQuery(value: unknown, label: string): string | undefined {
  if (value == null) return undefined;
  return expectString(value, label, { allowEmpty: true });
}

export function parseScreenKey(value: unknown, label = "screen key"): ScreenKey {
  return expectEnum(value, label, SCREEN_KEYS);
}

export function parseProjectionMode(value: unknown, label = "mode"): CpProjectionMode {
  return expectEnum(value, label, PROJECTION_MODES);
}

export function parseBackgroundFillMode(value: unknown, label = "backgroundMode"): CpBackgroundFillMode {
  return expectEnum(value, label, BACKGROUND_FILL_MODES);
}

export function parseForegroundFillMode(value: unknown, label = "foregroundMode"): CpForegroundFillMode {
  return expectEnum(value, label, FOREGROUND_FILL_MODES);
}

export function parseLogoPosition(value: unknown, label = "logoPosition"): CpLogoPosition {
  return expectEnum(value, label, LOGO_POSITIONS);
}

export function parseMediaType(value: unknown, label = "mediaType"): CpMediaType {
  return expectEnum(value, label, MEDIA_TYPES);
}

export function parseDevtoolsTarget(value: unknown): CpDevtoolsTarget {
  return expectEnum(value, "devtools target", DEVTOOLS_TARGETS);
}

export function parseFilesDeleteMediaPayload(value: unknown): { path: string } {
  const rec = expectRecord(value, "files:deleteMedia payload");
  return { path: expectString(rec.path, "files:deleteMedia.path") };
}

export function parseFilesRenameMediaPayload(value: unknown): { path: string; name: string } {
  const rec = expectRecord(value, "files:renameMedia payload");
  return {
    path: expectString(rec.path, "files:renameMedia.path"),
    name: expectString(rec.name, "files:renameMedia.name"),
  };
}

export function parseProjectionStatePatch(value: unknown): Partial<CpProjectionState> {
  const rec = expectRecord(value, "projection:setState payload");
  const patch: Partial<CpProjectionState> = {};

  if (rec.mode !== undefined) patch.mode = parseProjectionMode(rec.mode, "projection:setState.mode");
  if (rec.lowerThirdEnabled !== undefined) {
    patch.lowerThirdEnabled = expectBoolean(rec.lowerThirdEnabled, "projection:setState.lowerThirdEnabled");
  }
  if (rec.transitionEnabled !== undefined) {
    patch.transitionEnabled = expectBoolean(rec.transitionEnabled, "projection:setState.transitionEnabled");
  }
  if (rec.textScale !== undefined) patch.textScale = expectNumber(rec.textScale, "projection:setState.textScale");
  if (rec.textFont !== undefined) patch.textFont = expectString(rec.textFont, "projection:setState.textFont");
  if (rec.textFontPath !== undefined) patch.textFontPath = expectString(rec.textFontPath, "projection:setState.textFontPath", { allowEmpty: true });
  if (rec.background !== undefined) patch.background = expectString(rec.background, "projection:setState.background");
  if (rec.backgroundMode !== undefined) patch.backgroundMode = parseBackgroundFillMode(rec.backgroundMode, "projection:setState.backgroundMode");
  if (rec.backgroundGradientFrom !== undefined) patch.backgroundGradientFrom = expectString(rec.backgroundGradientFrom, "projection:setState.backgroundGradientFrom");
  if (rec.backgroundGradientTo !== undefined) patch.backgroundGradientTo = expectString(rec.backgroundGradientTo, "projection:setState.backgroundGradientTo");
  if (rec.backgroundGradientAngle !== undefined) patch.backgroundGradientAngle = expectNumber(rec.backgroundGradientAngle, "projection:setState.backgroundGradientAngle");
  if (rec.foregroundMode !== undefined) patch.foregroundMode = parseForegroundFillMode(rec.foregroundMode, "projection:setState.foregroundMode");
  if (rec.foregroundGradientFrom !== undefined) patch.foregroundGradientFrom = expectString(rec.foregroundGradientFrom, "projection:setState.foregroundGradientFrom");
  if (rec.foregroundGradientTo !== undefined) patch.foregroundGradientTo = expectString(rec.foregroundGradientTo, "projection:setState.foregroundGradientTo");
  if (rec.foreground !== undefined) patch.foreground = expectString(rec.foreground, "projection:setState.foreground");
  if (rec.logoPath !== undefined) patch.logoPath = expectString(rec.logoPath, "projection:setState.logoPath", { allowEmpty: true });
  if (rec.current !== undefined) patch.current = parseProjectionCurrent(rec.current, "projection:setState.current");

  return patch;
}

export function parseProjectionSetAppearancePayload(value: unknown): CpProjectionSetAppearancePayload {
  const rec = expectRecord(value, "projection:setAppearance payload");
  const patch: CpProjectionSetAppearancePayload = {};

  if (rec.textScale !== undefined) patch.textScale = expectNumber(rec.textScale, "projection:setAppearance.textScale");
  if (rec.textFont !== undefined) patch.textFont = expectString(rec.textFont, "projection:setAppearance.textFont");
  if (rec.textFontPath !== undefined) patch.textFontPath = expectString(rec.textFontPath, "projection:setAppearance.textFontPath", { allowEmpty: true });
  if (rec.background !== undefined) patch.background = expectString(rec.background, "projection:setAppearance.background");
  if (rec.backgroundMode !== undefined) patch.backgroundMode = parseBackgroundFillMode(rec.backgroundMode, "projection:setAppearance.backgroundMode");
  if (rec.backgroundGradientFrom !== undefined) patch.backgroundGradientFrom = expectString(rec.backgroundGradientFrom, "projection:setAppearance.backgroundGradientFrom");
  if (rec.backgroundGradientTo !== undefined) patch.backgroundGradientTo = expectString(rec.backgroundGradientTo, "projection:setAppearance.backgroundGradientTo");
  if (rec.backgroundGradientAngle !== undefined) patch.backgroundGradientAngle = expectNumber(rec.backgroundGradientAngle, "projection:setAppearance.backgroundGradientAngle");
  if (rec.backgroundImage !== undefined) patch.backgroundImage = expectString(rec.backgroundImage, "projection:setAppearance.backgroundImage", { allowEmpty: true });
  if (rec.logoPath !== undefined) patch.logoPath = expectString(rec.logoPath, "projection:setAppearance.logoPath", { allowEmpty: true });
  if (rec.logoPosition !== undefined) patch.logoPosition = parseLogoPosition(rec.logoPosition, "projection:setAppearance.logoPosition");
  if (rec.logoOpacity !== undefined) patch.logoOpacity = expectNumber(rec.logoOpacity, "projection:setAppearance.logoOpacity");
  if (rec.foregroundMode !== undefined) patch.foregroundMode = parseForegroundFillMode(rec.foregroundMode, "projection:setAppearance.foregroundMode");
  if (rec.foregroundGradientFrom !== undefined) patch.foregroundGradientFrom = expectString(rec.foregroundGradientFrom, "projection:setAppearance.foregroundGradientFrom");
  if (rec.foregroundGradientTo !== undefined) patch.foregroundGradientTo = expectString(rec.foregroundGradientTo, "projection:setAppearance.foregroundGradientTo");
  if (rec.foreground !== undefined) patch.foreground = expectString(rec.foreground, "projection:setAppearance.foreground");

  return patch;
}

export function parseProjectionSetTextPayload(value: unknown): CpProjectionSetTextPayload {
  const rec = expectRecord(value, "projection:setContentText payload");
  return {
    title: expectOptionalString(rec.title, "projection:setContentText.title", { trim: false, allowEmpty: true }),
    body: expectString(rec.body, "projection:setContentText.body", { trim: false, allowEmpty: true }),
    metaSong: parseSongMeta(rec.metaSong, "projection:setContentText.metaSong"),
  };
}

export function parseProjectionSetMediaPayload(value: unknown): CpProjectionSetMediaPayload {
  const rec = expectRecord(value, "projection:setContentMedia payload");
  return {
    title: expectOptionalString(rec.title, "projection:setContentMedia.title", { trim: false, allowEmpty: true }),
    mediaPath: expectString(rec.mediaPath, "projection:setContentMedia.mediaPath"),
    mediaType: parseMediaType(rec.mediaType, "projection:setContentMedia.mediaType"),
  };
}

export function parseScreenMirrorMode(value: unknown): ScreenMirrorMode {
  const rec = expectRecord(value, "screens:setMirror mirror");
  const kind = expectEnum(rec.kind, "screens:setMirror.mirror.kind", SCREEN_MIRROR_MODES);

  if (kind === "FREE") return { kind: "FREE" };

  return {
    kind: "MIRROR",
    from: parseScreenKey(rec.from, "screens:setMirror.mirror.from"),
  };
}

export function parseLiveSetPayload(value: unknown): CpLiveSetPayload {
  const rec = expectRecord(value, "live:set payload");
  const payload: CpLiveSetPayload = {};

  if ("planId" in rec) {
    payload.planId = rec.planId === null ? null : expectString(rec.planId, "live:set.planId");
  }
  if ("cursor" in rec) {
    payload.cursor = rec.cursor === null ? null : expectNumber(rec.cursor, "live:set.cursor", { integer: true });
  }
  if ("enabled" in rec) payload.enabled = expectBoolean(rec.enabled, "live:set.enabled");
  if ("target" in rec) payload.target = parseScreenKey(rec.target, "live:set.target");
  if ("black" in rec) payload.black = expectBoolean(rec.black, "live:set.black");
  if ("white" in rec) payload.white = expectBoolean(rec.white, "live:set.white");

  return payload;
}

export function parseLiveCursor(value: unknown): number {
  return expectNumber(value, "live:setCursor.cursor", { integer: true });
}

export function parseLiveSetLockedPayload(value: unknown): { key: ScreenKey; locked: boolean } {
  const rec = expectRecord(value, "live:setLocked payload");
  return {
    key: parseScreenKey(rec.key, "live:setLocked.key"),
    locked: expectBoolean(rec.locked, "live:setLocked.locked"),
  };
}

export function parseSongCreatePayload(value: unknown): { title: string; artist?: string; album?: string; year?: string } {
  const rec = expectRecord(value, "songs:create payload");
  return {
    title: expectString(rec.title, "songs:create.title"),
    artist: expectOptionalString(rec.artist, "songs:create.artist"),
    album: expectOptionalString(rec.album, "songs:create.album"),
    year: expectOptionalString(rec.year, "songs:create.year"),
  };
}

export function parseSongUpdateMetaPayload(value: unknown): { id: string; title: string; artist?: string; album?: string; year?: string } {
  const rec = expectRecord(value, "songs:updateMeta payload");
  return {
    id: expectString(rec.id, "songs:updateMeta.id"),
    title: expectString(rec.title, "songs:updateMeta.title"),
    artist: expectOptionalString(rec.artist, "songs:updateMeta.artist"),
    album: expectOptionalString(rec.album, "songs:updateMeta.album"),
    year: expectOptionalString(rec.year, "songs:updateMeta.year"),
  };
}

export function parseSongReplaceBlocksPayload(value: unknown): { songId: string; blocks: Array<{ order: number; type: string; title?: string; content: string }> } {
  const rec = expectRecord(value, "songs:replaceBlocks payload");
  const blocksRaw = expectArray(rec.blocks, "songs:replaceBlocks.blocks");

  const blocks = blocksRaw.map((rawBlock, idx) => {
    const b = expectRecord(rawBlock, `songs:replaceBlocks.blocks[${idx}]`);
    return {
      order: expectNumber(b.order, `songs:replaceBlocks.blocks[${idx}].order`, { integer: true, min: 1 }),
      type: expectString(b.type, `songs:replaceBlocks.blocks[${idx}].type`),
      title: expectOptionalString(b.title, `songs:replaceBlocks.blocks[${idx}].title`),
      content: expectString(b.content, `songs:replaceBlocks.blocks[${idx}].content`, { trim: false, allowEmpty: true }),
    };
  });

  return {
    songId: expectString(rec.songId, "songs:replaceBlocks.songId"),
    blocks,
  };
}

export function parseSongExportWordPackPayload(value: unknown): { songIds?: string[] } {
  if (value == null) return {};
  const rec = expectRecord(value, "songs:exportWordPack payload");
  if (rec.songIds == null) return {};
  const songIds = expectArray(rec.songIds, "songs:exportWordPack.songIds").map((id, idx) =>
    expectString(id, `songs:exportWordPack.songIds[${idx}]`)
  );
  return { songIds };
}

export function parsePlanDuplicatePayload(value: unknown): CpPlanDuplicatePayload {
  const rec = expectRecord(value, "plans:duplicate payload");
  return {
    planId: expectString(rec.planId, "plans:duplicate.planId"),
    dateIso: expectOptionalString(rec.dateIso, "plans:duplicate.dateIso"),
    title: expectOptionalString(rec.title, "plans:duplicate.title"),
  };
}

export function parsePlanCreatePayload(value: unknown): CpPlanCreatePayload {
  const rec = expectRecord(value, "plans:create payload");
  return {
    dateIso: expectString(rec.dateIso, "plans:create.dateIso"),
    title: expectOptionalString(rec.title, "plans:create.title"),
  };
}

export function parsePlanUpdatePayload(value: unknown): CpPlanUpdatePayload {
  const rec = expectRecord(value, "plans:update payload");
  return {
    planId: expectString(rec.planId, "plans:update.planId"),
    title: expectOptionalString(rec.title, "plans:update.title"),
  };
}

export function parsePlanUpdateItemPayload(value: unknown): CpPlanUpdateItemPayload {
  const rec = expectRecord(value, "plans:updateItem payload");
  return {
    planId: expectString(rec.planId, "plans:updateItem.planId"),
    itemId: expectString(rec.itemId, "plans:updateItem.itemId"),
    title: expectOptionalString(rec.title, "plans:updateItem.title", { trim: false, allowEmpty: true }),
    content: expectOptionalString(rec.content, "plans:updateItem.content", { trim: false, allowEmpty: true }),
    notes: expectOptionalString(rec.notes, "plans:updateItem.notes", { trim: false, allowEmpty: true }),
  };
}

export function parsePlanAddItemPayload(value: unknown): CpPlanAddItemPayload {
  const rec = expectRecord(value, "plans:addItem payload");
  return {
    planId: expectString(rec.planId, "plans:addItem.planId"),
    kind: expectEnum(rec.kind, "plans:addItem.kind", CP_PLAN_ITEM_KIND_VALUES),
    title: expectOptionalString(rec.title, "plans:addItem.title", { trim: false, allowEmpty: true }),
    content: expectOptionalString(rec.content, "plans:addItem.content", { trim: false, allowEmpty: true }),
    refId: expectOptionalString(rec.refId, "plans:addItem.refId"),
    refSubId: expectOptionalString(rec.refSubId, "plans:addItem.refSubId"),
    mediaPath: expectOptionalString(rec.mediaPath, "plans:addItem.mediaPath"),
  };
}

export function parsePlanRemoveItemPayload(value: unknown): CpPlanRemoveItemPayload {
  const rec = expectRecord(value, "plans:removeItem payload");
  return {
    planId: expectString(rec.planId, "plans:removeItem.planId"),
    itemId: expectString(rec.itemId, "plans:removeItem.itemId"),
  };
}

export function parsePlanReorderPayload(value: unknown): CpPlanReorderPayload {
  const rec = expectRecord(value, "plans:reorder payload");
  return {
    planId: expectString(rec.planId, "plans:reorder.planId"),
    orderedItemIds: expectArray(rec.orderedItemIds, "plans:reorder.orderedItemIds").map((id, idx) =>
      expectString(id, `plans:reorder.orderedItemIds[${idx}]`)
    ),
  };
}

export function parsePlanExportPayload(value: unknown): CpPlanExportPayload {
  const rec = expectRecord(value, "plans:export payload");
  return {
    planId: expectString(rec.planId, "plans:export.planId"),
  };
}

export function parseDataImportPayload(value: unknown): { mode: CpDataImportMode; atomicity: CpDataImportAtomicity } {
  if (value == null) return { mode: "MERGE", atomicity: "ENTITY" };
  const rec = expectRecord(value, "data:importAll payload");
  const mode = rec.mode == null ? "MERGE" : expectEnum(rec.mode, "data:importAll.mode", DATA_IMPORT_MODES);
  const atomicity =
    rec.atomicity == null
      ? mode === "REPLACE"
        ? "STRICT"
        : "ENTITY"
      : expectEnum(rec.atomicity, "data:importAll.atomicity", DATA_IMPORT_ATOMICITY);
  return { mode, atomicity };
}
