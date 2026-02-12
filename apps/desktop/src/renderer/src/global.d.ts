export {};

declare global {
  type ScreenKey = "A" | "B" | "C";
  type ScreenMirrorMode = { kind: "FREE" } | { kind: "MIRROR"; from: ScreenKey };
  type CpProjectionMode = "NORMAL" | "BLACK" | "WHITE";
  type CpMediaType = "IMAGE" | "PDF";
  type CpSongMeta = { title?: string; artist?: string; album?: string; year?: string };
  type CpWindowState = { isOpen: boolean };
  type CpProjectionCurrent = {
    kind: "EMPTY" | "TEXT" | "MEDIA";
    title?: string;
    body?: string;
    mediaPath?: string;
    mediaType?: CpMediaType;
    metaSong?: CpSongMeta;
  };
  type CpProjectionState = {
    mode: CpProjectionMode;
    lowerThirdEnabled: boolean;
    transitionEnabled: boolean;
    textScale: number;
    background: string;
    foreground: string;
    current: CpProjectionCurrent;
    updatedAt: number;
  };
  type CpScreenMeta = { key: ScreenKey; isOpen: boolean; mirror: ScreenMirrorMode };
  type CpLiveState = {
    enabled: boolean;
    planId: string | null;
    cursor: number;
    target: ScreenKey;
    black: boolean;
    white: boolean;
    lockedScreens: Record<ScreenKey, boolean>;
    updatedAt: number;
  };
  type CpProjectionMutationResult =
    | { ok: true; state: CpProjectionState }
    | { ok: false; reason: "LOCKED"; state: CpProjectionState };
  type CpScreenMutationResult =
    | { ok: true; state: CpProjectionState }
    | { ok: false; reason: "MIRROR" | "LOCKED" };
  type CpScreenMirrorResult = { ok: true; mirror: ScreenMirrorMode };

  type CpSongBlockType = "VERSE" | "CHORUS" | string;
  type CpSongBlock = {
    id: string;
    order: number;
    type: CpSongBlockType;
    title?: string | null;
    content: string;
  };
  type CpSongListItem = {
    id: string;
    title: string;
    artist?: string | null;
    album?: string | null;
    updatedAt: string | Date;
  };
  type CpSongDetail = {
    id: string;
    title: string;
    artist?: string | null;
    album?: string | null;
    language?: string | null;
    tags?: string | null;
    blocks: CpSongBlock[];
    updatedAt?: string | Date;
    createdAt?: string | Date;
  };
  type CpSongDeleteResult = { ok: true };
  type CpSongExportWordResult = { ok: true; path: string } | { ok: false; canceled: true };
  type CpSongImportWordResult = { ok: true; song: CpSongDetail } | { ok: false; canceled: true };
  type CpSongImportJsonError = { path: string; title?: string; message: string };
  type CpSongImportJsonResult =
    | { ok: true; imported: number; errors: CpSongImportJsonError[]; path: string }
    | { ok: false; canceled: true }
    | { ok: false; error: string };
  type CpSongImportDocError = { path: string; message: string };
  type CpSongImportWordBatchResult =
    | { ok: true; imported: number; errors: CpSongImportDocError[]; files: string[] }
    | { ok: false; canceled: true };
  type CpSongImportAutoResult =
    | { ok: true; imported: number; docFiles: number; jsonFiles: number; errors: CpSongImportDocError[]; files: string[] }
    | { ok: false; canceled: true };

  type CpPlanItemKind =
    | "ANNOUNCEMENT_TEXT"
    | "ANNOUNCEMENT_IMAGE"
    | "ANNOUNCEMENT_PDF"
    | "VERSE_MANUAL"
    | "BIBLE_VERSE"
    | "BIBLE_PASSAGE"
    | "SONG_BLOCK"
    | string;
  type CpPlanItem = {
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
  type CpPlanListItem = {
    id: string;
    date: string | Date;
    title?: string | null;
    updatedAt: string | Date;
  };
  type CpPlan = {
    id: string;
    date: string | Date;
    title?: string | null;
    items: CpPlanItem[];
    updatedAt?: string | Date;
    createdAt?: string | Date;
  };
  type CpPlanAddItemPayload = {
    planId: string;
    kind: CpPlanItemKind;
    title?: string;
    content?: string;
    refId?: string;
    refSubId?: string;
    mediaPath?: string;
  };
  type CpPlanDuplicatePayload = { planId: string; dateIso?: string; title?: string };
  type CpPlanCreatePayload = { dateIso: string; title?: string };
  type CpPlanRemoveItemPayload = { planId: string; itemId: string };
  type CpPlanReorderPayload = { planId: string; orderedItemIds: string[] };
  type CpPlanExportPayload = { planId: string };
  type CpPlanDeleteResult = { ok: true };
  type CpPlanRemoveItemResult = { ok: true };
  type CpPlanReorderResult = { ok: true };
  type CpPlanExportResult = { ok: true; path: string } | { ok: false; canceled: true };

  type CpDataExportResult = { ok: true; path: string } | { ok: false; canceled: true };
  type CpDataImportCounts = { songs: number; plans: number };
  type CpDataImportError = { kind: string; title?: string; message: string };
  type CpDataImportResult =
    | { ok: true; imported: true; partial?: boolean; counts: CpDataImportCounts; errors: CpDataImportError[] }
    | { ok: false; canceled: true }
    | { ok: false; rolledBack?: boolean; error: string };

  type CpBibleTranslation = { short_name: string; full_name: string; dir?: string };
  type CpBibleLanguageGroup = { language: string; translations: CpBibleTranslation[] };
  type CpBibleListTranslationsResult = { ok: true; data: CpBibleLanguageGroup[] } | { ok: false; error: string };

  type CpDevtoolsTarget = "REGIE" | "PROJECTION" | "SCREEN_A" | "SCREEN_B" | "SCREEN_C";
  type CpDevtoolsOpenResult = { ok: true };

  type CpMediaFile = { name: string; path: string; mediaType: CpMediaType };
  type CpFilesPickMediaResult =
    | { ok: true; path: string; mediaType: CpMediaType }
    | { ok: false; canceled: true }
    | { ok: false; error: string };
  type CpFilesListMediaResult = { ok: true; files: CpMediaFile[] } | { ok: false; error: string };
  type CpFilesDeleteMediaResult = { ok: true } | { ok: false; error: string };

  interface Window {
    cp: {
      projection: {
        getState: () => Promise<CpProjectionState>;
        setState: (patch: Partial<CpProjectionState>) => Promise<CpProjectionMutationResult>;
        setContentText: (payload: { title?: string; body: string; metaSong?: CpSongMeta }) => Promise<CpProjectionMutationResult>;
        setContentMedia: (payload: { title?: string; mediaPath: string; mediaType: CpMediaType }) => Promise<CpProjectionMutationResult>;
        setMode: (mode: CpProjectionMode) => Promise<CpProjectionMutationResult>;
        onState: (cb: (state: CpProjectionState) => void) => () => void;
        setAppearance: (payload: { textScale?: number; background?: string; foreground?: string }) => Promise<CpProjectionMutationResult>;
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
        setContentText: (key: ScreenKey, payload: { title?: string; body: string; metaSong?: CpSongMeta }) => Promise<CpScreenMutationResult>;
        setContentMedia: (key: ScreenKey, payload: { title?: string; mediaPath: string; mediaType: CpMediaType }) => Promise<CpScreenMutationResult>;
        setMode: (key: ScreenKey, mode: CpProjectionMode) => Promise<CpScreenMutationResult>;
        onState: (key: ScreenKey, cb: (state: CpProjectionState) => void) => () => void;
        onWindowState: (key: ScreenKey, cb: (payload: CpWindowState) => void) => () => void;
      };

      songs: {
        list: (q?: string) => Promise<CpSongListItem[]>;
        get: (id: string) => Promise<CpSongDetail | null>;
        create: (payload: { title: string; artist?: string; album?: string }) => Promise<CpSongDetail>;
        updateMeta: (payload: { id: string; title: string; artist?: string; album?: string }) => Promise<CpSongDetail>;
        replaceBlocks: (payload: {
          songId: string;
          blocks: Array<{ order: number; type: CpSongBlockType; title?: string; content: string }>;
        }) => Promise<CpSongDetail | null>;
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
        importAll: (payload: { mode: "MERGE" | "REPLACE" }) => Promise<CpDataImportResult>;
      };

      bible: {
        listTranslations: () => Promise<CpBibleListTranslationsResult>;
      };

      live: {
        get: () => Promise<CpLiveState>;
        set: (payload: { planId?: string | null; cursor?: number | null; enabled?: boolean; target?: ScreenKey; black?: boolean; white?: boolean }) => Promise<CpLiveState>;
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
    };
  }
}
