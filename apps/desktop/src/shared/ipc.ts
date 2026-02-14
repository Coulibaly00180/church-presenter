export type ScreenKey = "A" | "B" | "C";
export type ScreenMirrorMode = { kind: "FREE" } | { kind: "MIRROR"; from: ScreenKey };

export type CpProjectionMode = "NORMAL" | "BLACK" | "WHITE";
export type CpMediaType = "IMAGE" | "PDF";
export type CpSongMeta = { title?: string; artist?: string; album?: string; year?: string };
export type CpWindowState = { isOpen: boolean };

export type CpProjectionCurrent = {
  kind: "EMPTY" | "TEXT" | "MEDIA";
  title?: string;
  body?: string;
  mediaPath?: string;
  mediaType?: CpMediaType;
  metaSong?: CpSongMeta;
};

export type CpProjectionState = {
  mode: CpProjectionMode;
  lowerThirdEnabled: boolean;
  transitionEnabled: boolean;
  textScale: number;
  background: string;
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
  | { ok: false; reason: "MIRROR" | "LOCKED" };

export type CpScreenMirrorResult = { ok: true; mirror: ScreenMirrorMode };

export type CpSongBlockType = "VERSE" | "CHORUS" | string;

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
export type CpSongExportWordResult = { ok: true; path: string } | { ok: false; canceled: true };
export type CpSongImportWordResult = { ok: true; song: CpSongDetail } | { ok: false; canceled: true };
export type CpSongImportJsonError = { path: string; title?: string; message: string };
export type CpSongImportJsonResult =
  | { ok: true; imported: number; errors: CpSongImportJsonError[]; path: string }
  | { ok: false; canceled: true }
  | { ok: false; error: string };

export type CpSongImportDocError = { path: string; message: string };
export type CpSongImportWordBatchResult =
  | { ok: true; imported: number; errors: CpSongImportDocError[]; files: string[] }
  | { ok: false; canceled: true };

export type CpSongImportAutoResult =
  | { ok: true; imported: number; docFiles: number; jsonFiles: number; errors: CpSongImportDocError[]; files: string[] }
  | { ok: false; canceled: true };

export type CpPlanItemKind =
  | "ANNOUNCEMENT_TEXT"
  | "ANNOUNCEMENT_IMAGE"
  | "ANNOUNCEMENT_PDF"
  | "VERSE_MANUAL"
  | "BIBLE_VERSE"
  | "BIBLE_PASSAGE"
  | "SONG_BLOCK"
  | string;

export type CpPlanItem = {
  id: string;
  planId: string;
  order: number;
  kind: CpPlanItemKind;
  title?: string | null;
  content?: string | null;
  refId?: string | null;
  refSubId?: string | null;
  mediaPath?: string | null;
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
  items: CpPlanItem[];
  updatedAt?: string | Date;
  createdAt?: string | Date;
};

export type CpPlanAddItemPayload = {
  planId: string;
  kind: CpPlanItemKind;
  title?: string;
  content?: string;
  refId?: string;
  refSubId?: string;
  mediaPath?: string;
};

export type CpPlanDuplicatePayload = { planId: string; dateIso?: string; title?: string };
export type CpPlanCreatePayload = { dateIso: string; title?: string };
export type CpPlanRemoveItemPayload = { planId: string; itemId: string };
export type CpPlanReorderPayload = { planId: string; orderedItemIds: string[] };
export type CpPlanExportPayload = { planId: string };

export type CpPlanDeleteResult = { ok: true };
export type CpPlanRemoveItemResult = { ok: true };
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

export type CpMediaFile = { name: string; path: string; mediaType: CpMediaType };
export type CpFilesPickMediaResult =
  | { ok: true; path: string; mediaType: CpMediaType }
  | { ok: false; canceled: true }
  | { ok: false; error: string };
export type CpFilesListMediaResult = { ok: true; files: CpMediaFile[] } | { ok: false; error: string };
export type CpFilesDeleteMediaResult = { ok: true } | { ok: false; error: string };

export type CpProjectionSetAppearancePayload = { textScale?: number; background?: string; foreground?: string };
export type CpProjectionSetTextPayload = { title?: string; body: string; metaSong?: CpSongMeta };
export type CpProjectionSetMediaPayload = { title?: string; mediaPath: string; mediaType: CpMediaType };
export type CpLiveSetPayload = {
  planId?: string | null;
  cursor?: number | null;
  enabled?: boolean;
  target?: ScreenKey;
  black?: boolean;
  white?: boolean;
};

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
    setContentText: (key: ScreenKey, payload: CpProjectionSetTextPayload) => Promise<CpScreenMutationResult>;
    setContentMedia: (key: ScreenKey, payload: CpProjectionSetMediaPayload) => Promise<CpScreenMutationResult>;
    setMode: (key: ScreenKey, mode: CpProjectionMode) => Promise<CpScreenMutationResult>;
    onState: (key: ScreenKey, cb: (state: CpProjectionState) => void) => () => void;
    onWindowState: (key: ScreenKey, cb: (payload: CpWindowState) => void) => () => void;
  };
  songs: {
    list: (q?: string) => Promise<CpSongListItem[]>;
    get: (id: string) => Promise<CpSongDetail | null>;
    create: (payload: { title: string; artist?: string; album?: string; year?: string }) => Promise<CpSongDetail>;
    updateMeta: (payload: { id: string; title: string; artist?: string; album?: string; year?: string }) => Promise<CpSongDetail>;
    replaceBlocks: (payload: { songId: string; blocks: Array<{ order: number; type: CpSongBlockType; title?: string; content: string }> }) => Promise<CpSongDetail | null>;
    delete: (id: string) => Promise<CpSongDeleteResult>;
    exportWord: (id: string) => Promise<CpSongExportWordResult>;
    importWord: () => Promise<CpSongImportWordResult>;
    importJson: () => Promise<CpSongImportJsonResult>;
    importWordBatch: () => Promise<CpSongImportWordBatchResult>;
    importAuto: () => Promise<CpSongImportAutoResult>;
  };
  plans: {
    list: () => Promise<CpPlanListItem[]>;
    get: (id: string) => Promise<CpPlan | null>;
    duplicate: (payload: CpPlanDuplicatePayload) => Promise<CpPlan | null>;
    create: (payload: CpPlanCreatePayload) => Promise<CpPlan>;
    delete: (planId: string) => Promise<CpPlanDeleteResult>;
    addItem: (payload: CpPlanAddItemPayload) => Promise<CpPlanItem>;
    removeItem: (payload: CpPlanRemoveItemPayload) => Promise<CpPlanRemoveItemResult>;
    reorder: (payload: CpPlanReorderPayload) => Promise<CpPlanReorderResult>;
    export: (payload: CpPlanExportPayload) => Promise<CpPlanExportResult>;
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
  };
  devtools: {
    open: (target: CpDevtoolsTarget) => Promise<CpDevtoolsOpenResult>;
  };
  files: {
    pickMedia: () => Promise<CpFilesPickMediaResult>;
    deleteMedia: (payload: { path: string }) => Promise<CpFilesDeleteMediaResult>;
    listMedia: () => Promise<CpFilesListMediaResult>;
  };
}
