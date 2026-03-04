import type { CpPlanItemKind } from "./planKinds";
export type { CpPlanItemKind } from "./planKinds";

export type ScreenKey = "A" | "B" | "C";
export type ScreenMirrorMode = { kind: "FREE" } | { kind: "MIRROR"; from: ScreenKey };

export type CpProjectionMode = "NORMAL" | "BLACK" | "WHITE";
export type CpMediaType = "IMAGE" | "PDF" | "VIDEO";
export type CpBackgroundFillMode = "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL";
export type CpForegroundFillMode = "SOLID" | "GRADIENT";
export type CpLogoPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center";
export type CpTheme = "light" | "dark";
export type CpSongMeta = { title?: string; artist?: string; album?: string; year?: string };
export type CpWindowState = { isOpen: boolean };

export type CpItemBackground = {
  background?: string;
  backgroundMode?: CpBackgroundFillMode;
  backgroundGradientFrom?: string;
  backgroundGradientTo?: string;
  backgroundGradientAngle?: number;
  backgroundMedia?: string;          // absolute path to IMAGE or VIDEO file in media library
  backgroundMediaType?: "IMAGE" | "VIDEO";
  foreground?: string;
  foregroundMode?: CpForegroundFillMode;
  foregroundGradientFrom?: string;
  foregroundGradientTo?: string;
};

export type CpProjectionCurrent = {
  kind: "EMPTY" | "TEXT" | "MEDIA";
  title?: string;
  body?: string;
  mediaPath?: string;
  mediaType?: CpMediaType;
  metaSong?: CpSongMeta;
  secondaryTexts?: Array<{ label: string; body: string }>;
  backgroundOverride?: CpItemBackground;
};

export type CpProjectionState = {
  mode: CpProjectionMode;
  lowerThirdEnabled: boolean;
  transitionEnabled: boolean;
  textScale: number;
  titleTextScale?: number;
  textFont: string;
  textFontPath?: string;
  background: string;
  backgroundMode?: CpBackgroundFillMode;
  backgroundGradientFrom?: string;
  backgroundGradientTo?: string;
  backgroundGradientAngle?: number;
  backgroundImage?: string;
  logoPath?: string;
  logoPosition?: CpLogoPosition;
  logoOpacity?: number;
  foregroundMode?: CpForegroundFillMode;
  foregroundGradientFrom?: string;
  foregroundGradientTo?: string;
  foreground: string;
  current: CpProjectionCurrent;
  updatedAt: number;
};

export type CpScreenMeta = { key: ScreenKey; isOpen: boolean; mirror: ScreenMirrorMode };

export type CpLiveState = {
  enabled: boolean;
  planId: string | null;
  cursor: number;
  target: ScreenKey;
  black: boolean;
  white: boolean;
  lockedScreens: Record<ScreenKey, boolean>;
  updatedAt: number;
};

export type CpProjectionMutationResult =
  | { ok: true; state: CpProjectionState }
  | { ok: false; reason: "LOCKED"; state: CpProjectionState };

export type CpScreenMutationResult =
  | { ok: true; state: CpProjectionState }
  | { ok: false; reason: "MIRROR" | "LOCKED"; state: CpProjectionState };

export type CpScreenMirrorResult = { ok: true; mirror: ScreenMirrorMode };

export type CpSongBlockType = "VERSE" | "CHORUS" | string;

export type CpSongSortField = "title" | "artist" | "updatedAt" | "createdAt";

export type CpSongBlock = {
  id: string;
  order: number;
  type: CpSongBlockType;
  title?: string | null;
  content: string;
};

export type CpSongListItem = {
  id: string;
  title: string;
  artist?: string | null;
  album?: string | null;
  year?: string | null;
  updatedAt: string | Date;
  matchSnippet?: string | null;
};

export type CpSongDetail = {
  id: string;
  title: string;
  artist?: string | null;
  album?: string | null;
  year?: string | null;
  language?: string | null;
  tags?: string | null;
  blocks: CpSongBlock[];
  updatedAt?: string | Date;
  createdAt?: string | Date;
};

export type CpSongDeleteResult = { ok: true };
export type CpSongImportReportEntry = {
  path: string;
  status: "SUCCESS" | "ERROR";
  title?: string;
  message?: string;
  warnings?: string[];
  normalized?: {
    title: string;
    artist?: string;
    album?: string;
    year?: string;
    language?: string;
  };
};
export type CpSongExportWordResult = { ok: true; path: string; format: "SINGLE_DOCX" } | { ok: false; canceled: true };
export type CpSongExportWordPackResult =
  | { ok: true; path: string; count: number; format: "PACK_ZIP_DOCX" }
  | { ok: false; canceled: true };
export type CpSongImportWordResult =
  | { ok: true; song: CpSongDetail; report: CpSongImportReportEntry[] }
  | { ok: false; canceled: true };
export type CpSongImportJsonError = { path: string; title?: string; message: string };
export type CpSongImportJsonResult =
  | { ok: true; imported: number; errors: CpSongImportJsonError[]; path: string; report: CpSongImportReportEntry[] }
  | { ok: false; canceled: true }
  | { ok: false; error: string };

export type CpSongImportDocError = { path: string; message: string };
export type CpSongImportWordBatchResult =
  | { ok: true; imported: number; errors: CpSongImportDocError[]; files: string[]; report: CpSongImportReportEntry[] }
  | { ok: false; canceled: true };

export type CpSongImportAutoResult =
  | { ok: true; imported: number; docFiles: number; jsonFiles: number; errors: CpSongImportDocError[]; files: string[]; report: CpSongImportReportEntry[] }
  | { ok: false; canceled: true };

export type CpPlanItem = {
  id: string;
  planId: string;
  order: number;
  kind: CpPlanItemKind;
  title?: string | null;
  content?: string | null;
  notes?: string | null;
  refId?: string | null;
  refSubId?: string | null;
  mediaPath?: string | null;
  secondaryContent?: string | null;
  backgroundConfig?: string | null;
  updatedAt?: string | Date;
  createdAt?: string | Date;
};

export type CpPlanListItem = {
  id: string;
  date: string | Date;
  title?: string | null;
  updatedAt: string | Date;
};

export type CpPlan = {
  id: string;
  date: string | Date;
  title?: string | null;
  backgroundConfig?: string | null;
  items: CpPlanItem[];
  updatedAt?: string | Date;
  createdAt?: string | Date;
};

export type CpPlanAddItemPayload = {
  planId: string;
  kind: CpPlanItemKind;
  title?: string;
  content?: string;
  notes?: string;
  refId?: string;
  refSubId?: string;
  mediaPath?: string;
  secondaryContent?: string;
  backgroundConfig?: string;
};

export type CpPlanDuplicatePayload = { planId: string; dateIso?: string; title?: string };
export type CpPlanCreatePayload = { dateIso: string; title?: string };
export type CpPlanUpdatePayload = { planId: string; title?: string; backgroundConfig?: string | null };
export type CpPlanUpdateResult = { ok: true };
export type CpPlanUpdateItemPayload = { planId: string; itemId: string; title?: string; content?: string; notes?: string; secondaryContent?: string | null; backgroundConfig?: string | null };
export type CpPlanUpdateItemResult = { ok: true };
export type CpPlanRemoveItemPayload = { planId: string; itemId: string };
export type CpPlanRemoveItemsPayload = { planId: string; itemIds: string[] };
export type CpPlanReorderPayload = { planId: string; orderedItemIds: string[] };
export type CpPlanExportPayload = { planId: string };

export type CpPlanDeleteResult = { ok: true };
export type CpPlanRemoveItemResult = { ok: true };
export type CpPlanRemoveItemsResult = { ok: true };
export type CpPlanReorderResult = { ok: true };
export type CpPlanExportResult = { ok: true; path: string } | { ok: false; canceled: true };

export type CpDataImportMode = "MERGE" | "REPLACE";
export type CpDataImportAtomicity = "ENTITY" | "STRICT";
export type CpDataExportResult = { ok: true; path: string } | { ok: false; canceled: true };
export type CpDataImportCounts = { songs: number; plans: number };
export type CpDataImportError = { kind: string; title?: string; message: string };
export type CpDataImportResult =
  | { ok: true; imported: true; partial?: boolean; counts: CpDataImportCounts; errors: CpDataImportError[] }
  | { ok: false; canceled: true }
  | { ok: false; rolledBack?: boolean; error: string };

export type CpBibleTranslation = { short_name: string; full_name: string; dir?: string };
export type CpBibleLanguageGroup = { language: string; translations: CpBibleTranslation[] };
export type CpBibleListTranslationsResult = { ok: true; data: CpBibleLanguageGroup[] } | { ok: false; error: string };

export type CpDevtoolsTarget = "REGIE" | "PROJECTION" | "SCREEN_A" | "SCREEN_B" | "SCREEN_C";
export type CpDevtoolsOpenResult = { ok: true } | { ok: false; reason: "DISABLED_IN_PROD" };

export type CpLibraryFileKind = CpMediaType | "DOCUMENT" | "FONT";
export type CpLibraryFileFolder = "images" | "documents" | "fonts" | "videos" | "root";
export type CpMediaFile = {
  name: string;
  path: string;
  kind: CpLibraryFileKind;
  folder: CpLibraryFileFolder;
};
export type CpKeyBinding = {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
};
export type CpShortcutOverrides = Record<string, CpKeyBinding[]>;
export type CpTemplateItem = {
  kind: CpPlanItemKind;
  title?: string | null;
  content?: string | null;
  refId?: string | null;
  refSubId?: string | null;
  mediaPath?: string | null;
};
export type CpPlanTemplate = {
  id: string;
  name: string;
  items: CpTemplateItem[];
  createdAt: string;
};
export type CpJsonSchemaVersion = 2;
export type CpDataFileV2 = {
  kind: "CHURCH_PRESENTER_EXPORT";
  schemaVersion: CpJsonSchemaVersion;
  exportedAt: string;
  payload: {
    songs: unknown[];
    plans: unknown[];
  };
};
export type CpFilesPickMediaResult =
  | { ok: true; path: string; mediaType: CpMediaType }
  | { ok: false; canceled: true }
  | { ok: false; error: string };
export type CpFilesPickFontResult =
  | { ok: true; path: string }
  | { ok: false; canceled: true }
  | { ok: false; error: string };
export type CpFilesListMediaResult = { ok: true; rootDir: string; files: CpMediaFile[] } | { ok: false; error: string };
export type CpFilesDeleteMediaResult = { ok: true } | { ok: false; error: string };
export type CpFilesRenameMediaResult = { ok: true; path: string; name: string } | { ok: false; error: string };
export type CpFilesValidateFontResult =
  | { ok: true; valid: boolean; reason?: string; family?: string }
  | { ok: false; error: string };
export type CpFilesChooseLibraryDirResult =
  | { ok: true; path: string }
  | { ok: false; canceled: true }
  | { ok: false; error: string };
export type CpFilesGetLibraryDirResult = { ok: true; path: string } | { ok: false; error: string };
export type CpFilesReadMediaResult =
  | { ok: true; base64: string; mimeType: string }
  | { ok: false; error: string };
export type CpSettingsGetThemeResult = { ok: true; theme?: CpTheme } | { ok: false; error: string };
export type CpSettingsSetThemeResult = { ok: true; theme: CpTheme } | { ok: false; error: string };
export type CpSettingsGetShortcutsResult = { ok: true; shortcuts: CpShortcutOverrides } | { ok: false; error: string };
export type CpSettingsSetShortcutsResult = { ok: true; shortcuts: CpShortcutOverrides } | { ok: false; error: string };
export type CpSettingsGetTemplatesResult = { ok: true; templates: CpPlanTemplate[] } | { ok: false; error: string };
export type CpSettingsSetTemplatesResult = { ok: true; templates: CpPlanTemplate[] } | { ok: false; error: string };
export type CpSettingsProfile = {
  id: string;
  name: string;
  files?: { libraryDir?: string };
  projection?: { screens?: Partial<Record<ScreenKey, CpProjectionSetAppearancePayload>> };
  mirrors?: Partial<Record<ScreenKey, ScreenMirrorMode>>;
  createdAt: number;
  updatedAt: number;
};
export type CpSettingsProfilesSnapshot = {
  profiles: CpSettingsProfile[];
  activeProfileId: string | null;
};
export type CpSettingsGetProfilesResult = { ok: true; snapshot: CpSettingsProfilesSnapshot } | { ok: false; error: string };
export type CpSettingsProfileSaveResult =
  | { ok: true; snapshot: CpSettingsProfilesSnapshot; profile: CpSettingsProfile }
  | { ok: false; error: string };
export type CpSettingsProfileDeleteResult = { ok: true; snapshot: CpSettingsProfilesSnapshot } | { ok: false; error: string };

export type CpProjectionSetAppearancePayload = {
  textScale?: number;
  titleTextScale?: number;
  textFont?: string;
  textFontPath?: string;
  background?: string;
  backgroundMode?: CpBackgroundFillMode;
  backgroundGradientFrom?: string;
  backgroundGradientTo?: string;
  backgroundGradientAngle?: number;
  backgroundImage?: string;
  logoPath?: string;
  logoPosition?: CpLogoPosition;
  logoOpacity?: number;
  foregroundMode?: CpForegroundFillMode;
  foregroundGradientFrom?: string;
  foregroundGradientTo?: string;
  foreground?: string;
};
export type CpProjectionSetTextPayload = { title?: string; body: string; metaSong?: CpSongMeta; secondaryTexts?: Array<{ label: string; body: string }>; backgroundOverride?: CpItemBackground };
export type CpProjectionSetMediaPayload = { title?: string; mediaPath: string; mediaType: CpMediaType };
export type CpLiveSetPayload = {
  planId?: string | null;
  cursor?: number | null;
  enabled?: boolean;
  target?: ScreenKey;
  black?: boolean;
  white?: boolean;
};

export type CpSyncStatus = {
  running: boolean;
  port: number;
  clients: number;
  addresses: string[];
};

export type CpSyncStartResult = { ok: true; port: number; addresses: string[] } | { ok: false; error: string };
export type CpSyncStopResult = { ok: true };

export type CpDiagnosticsFolderState = {
  path: string;
  exists: boolean;
  readable: boolean;
  writable: boolean;
  fileCount: number;
  error?: string;
};
export type CpDiagnosticsScreenState = {
  key: ScreenKey;
  isOpen: boolean;
  mirror: ScreenMirrorMode;
  mode: CpProjectionMode;
  currentKind: CpProjectionCurrent["kind"];
  updatedAt: number;
};
export type CpDiagnosticsState = {
  generatedAt: number;
  appVersion: string;
  userDataDir: string;
  libraryDir: string;
  screens: CpDiagnosticsScreenState[];
  folders: {
    root: CpDiagnosticsFolderState;
    images: CpDiagnosticsFolderState;
    documents: CpDiagnosticsFolderState;
    fonts: CpDiagnosticsFolderState;
  };
};
export type CpDiagnosticsGetResult = { ok: true; diagnostics: CpDiagnosticsState } | { ok: false; error: string };

export type CpScreenStateEventPayload = { key: ScreenKey; state: CpProjectionState };
export type CpScreenWindowEventPayload = { key: ScreenKey; isOpen: boolean };

export interface CpApi {
  projection: {
    getState: () => Promise<CpProjectionState>;
    setState: (patch: Partial<CpProjectionState>) => Promise<CpProjectionMutationResult>;
    setContentText: (payload: CpProjectionSetTextPayload) => Promise<CpProjectionMutationResult>;
    setContentMedia: (payload: CpProjectionSetMediaPayload) => Promise<CpProjectionMutationResult>;
    setMode: (mode: CpProjectionMode) => Promise<CpProjectionMutationResult>;
    onState: (cb: (state: CpProjectionState) => void) => () => void;
    setAppearance: (payload: CpProjectionSetAppearancePayload) => Promise<CpProjectionMutationResult>;
  };
  projectionWindow: {
    open: () => Promise<CpWindowState>;
    close: () => Promise<CpWindowState>;
    isOpen: () => Promise<CpWindowState>;
    onWindowState: (cb: (payload: CpWindowState) => void) => () => void;
  };
  screens: {
    list: () => Promise<CpScreenMeta[]>;
    isOpen: (key: ScreenKey) => Promise<CpWindowState>;
    open: (key: ScreenKey) => Promise<CpWindowState>;
    close: (key: ScreenKey) => Promise<CpWindowState>;
    setMirror: (key: ScreenKey, mirror: ScreenMirrorMode) => Promise<CpScreenMirrorResult>;
    getState: (key: ScreenKey) => Promise<CpProjectionState>;
    setState: (key: ScreenKey, patch: Partial<CpProjectionState>) => Promise<CpScreenMutationResult>;
    setContentText: (key: ScreenKey, payload: CpProjectionSetTextPayload) => Promise<CpScreenMutationResult>;
    setContentMedia: (key: ScreenKey, payload: CpProjectionSetMediaPayload) => Promise<CpScreenMutationResult>;
    setMode: (key: ScreenKey, mode: CpProjectionMode) => Promise<CpScreenMutationResult>;
    setAppearance: (key: ScreenKey, payload: CpProjectionSetAppearancePayload) => Promise<CpScreenMutationResult>;
    onState: (key: ScreenKey, cb: (state: CpProjectionState) => void) => () => void;
    onWindowState: (key: ScreenKey, cb: (payload: CpWindowState) => void) => () => void;
  };
  songs: {
    list: (q?: string, sortBy?: CpSongSortField) => Promise<CpSongListItem[]>;
    get: (id: string) => Promise<CpSongDetail | null>;
    create: (payload: { title: string; artist?: string; album?: string; year?: string }) => Promise<CpSongDetail>;
    updateMeta: (payload: { id: string; title: string; artist?: string; album?: string; year?: string }) => Promise<CpSongDetail>;
    replaceBlocks: (payload: { songId: string; blocks: Array<{ order: number; type: CpSongBlockType; title?: string; content: string }> }) => Promise<CpSongDetail | null>;
    delete: (id: string) => Promise<CpSongDeleteResult>;
    exportWord: (id: string) => Promise<CpSongExportWordResult>;
    exportWordPack: (payload?: { songIds?: string[] }) => Promise<CpSongExportWordPackResult>;
    importWord: () => Promise<CpSongImportWordResult>;
    importJson: () => Promise<CpSongImportJsonResult>;
    importWordBatch: () => Promise<CpSongImportWordBatchResult>;
    importAuto: () => Promise<CpSongImportAutoResult>;
    getFrequent: (limit?: number) => Promise<CpSongListItem[]>;
  };
  plans: {
    list: () => Promise<CpPlanListItem[]>;
    get: (id: string) => Promise<CpPlan | null>;
    duplicate: (payload: CpPlanDuplicatePayload) => Promise<CpPlan | null>;
    create: (payload: CpPlanCreatePayload) => Promise<CpPlan>;
    update: (payload: CpPlanUpdatePayload) => Promise<CpPlanUpdateResult>;
    delete: (planId: string) => Promise<CpPlanDeleteResult>;
    addItem: (payload: CpPlanAddItemPayload) => Promise<CpPlanItem>;
    updateItem: (payload: CpPlanUpdateItemPayload) => Promise<CpPlanUpdateItemResult>;
    removeItem: (payload: CpPlanRemoveItemPayload) => Promise<CpPlanRemoveItemResult>;
    removeItems: (payload: CpPlanRemoveItemsPayload) => Promise<CpPlanRemoveItemsResult>;
    reorder: (payload: CpPlanReorderPayload) => Promise<CpPlanReorderResult>;
    export: (payload: CpPlanExportPayload) => Promise<CpPlanExportResult>;
    importFromFile: (planId: string) => Promise<{ ok: true; added: number } | { ok: false; canceled: true } | { ok: false; error: string }>;
  };
  data: {
    exportAll: () => Promise<CpDataExportResult>;
    importAll: (payload: { mode: CpDataImportMode; atomicity?: CpDataImportAtomicity }) => Promise<CpDataImportResult>;
  };
  bible: {
    listTranslations: () => Promise<CpBibleListTranslationsResult>;
  };
  live: {
    get: () => Promise<CpLiveState>;
    set: (payload: CpLiveSetPayload) => Promise<CpLiveState>;
    next: () => Promise<CpLiveState>;
    prev: () => Promise<CpLiveState>;
    setCursor: (cursor: number) => Promise<CpLiveState>;
    setTarget: (target: ScreenKey) => Promise<CpLiveState>;
    toggle: () => Promise<CpLiveState>;
    toggleBlack: () => Promise<CpLiveState>;
    toggleWhite: () => Promise<CpLiveState>;
    resume: () => Promise<CpLiveState>;
    setLocked: (key: ScreenKey, locked: boolean) => Promise<CpLiveState>;
    onUpdate: (cb: (state: CpLiveState) => void) => () => void;
    /** Free mode: called from projection window to forward arrow navigation to regie window */
    freeNavigate: (dir: 1 | -1) => Promise<void>;
    onFreeNavigate: (cb: (dir: 1 | -1) => void) => () => void;
    /** Video control: regie sends PLAY/PAUSE; projection windows receive via onVideoControl */
    videoControl: (action: "PLAY" | "PAUSE") => Promise<void>;
    onVideoControl: (cb: (action: "PLAY" | "PAUSE") => void) => () => void;
    /** Video volume: regie sends 0-1; projection windows receive via onVideoVolume */
    videoVolume: (volume: number) => Promise<void>;
    onVideoVolume: (cb: (volume: number) => void) => () => void;
  };
  sync: {
    start: (port?: number) => Promise<CpSyncStartResult>;
    stop: () => Promise<CpSyncStopResult>;
    status: () => Promise<CpSyncStatus>;
    onStatusChange: (cb: (status: CpSyncStatus) => void) => () => void;
  };
  devtools: {
    open: (target: CpDevtoolsTarget) => Promise<CpDevtoolsOpenResult>;
  };
  diagnostics: {
    getState: () => Promise<CpDiagnosticsGetResult>;
  };
  files: {
    pickMedia: () => Promise<CpFilesPickMediaResult>;
    pickFont: () => Promise<CpFilesPickFontResult>;
    validateFont: (payload: { path: string }) => Promise<CpFilesValidateFontResult>;
    deleteMedia: (payload: { path: string }) => Promise<CpFilesDeleteMediaResult>;
    renameMedia: (payload: { path: string; name: string }) => Promise<CpFilesRenameMediaResult>;
    listMedia: () => Promise<CpFilesListMediaResult>;
    chooseLibraryDir: () => Promise<CpFilesChooseLibraryDirResult>;
    getLibraryDir: () => Promise<CpFilesGetLibraryDirResult>;
    readMedia: (payload: { path: string }) => Promise<CpFilesReadMediaResult>;
  };
  settings: {
    getTheme: () => Promise<CpSettingsGetThemeResult>;
    setTheme: (theme: CpTheme) => Promise<CpSettingsSetThemeResult>;
    getShortcuts: () => Promise<CpSettingsGetShortcutsResult>;
    setShortcuts: (shortcuts: CpShortcutOverrides) => Promise<CpSettingsSetShortcutsResult>;
    getTemplates: () => Promise<CpSettingsGetTemplatesResult>;
    setTemplates: (templates: CpPlanTemplate[]) => Promise<CpSettingsSetTemplatesResult>;
    getProfiles: () => Promise<CpSettingsGetProfilesResult>;
    createProfile: (payload: { name: string }) => Promise<CpSettingsProfileSaveResult>;
    activateProfile: (payload: { profileId: string }) => Promise<CpSettingsProfileSaveResult>;
    renameProfile: (payload: { profileId: string; name: string }) => Promise<CpSettingsProfileSaveResult>;
    saveActiveProfile: () => Promise<CpSettingsProfileSaveResult>;
    deleteProfile: (payload: { profileId: string }) => Promise<CpSettingsProfileDeleteResult>;
  };
}
