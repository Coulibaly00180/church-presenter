export {};

declare global {
  type ScreenKey = "A" | "B" | "C";
  type ScreenMirrorMode = { kind: "FREE" } | { kind: "MIRROR"; from: ScreenKey };
  type CpProjectionMode = "NORMAL" | "BLACK" | "WHITE";
  type CpMediaType = "IMAGE" | "PDF";
  type CpSongMeta = { title?: string; artist?: string; album?: string; year?: string };
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

  interface Window {
    cp: {
      projection: {
        getState: () => Promise<CpProjectionState>;
        setState: (patch: Partial<CpProjectionState>) => Promise<any>;
        setContentText: (payload: { title?: string; body: string; metaSong?: CpSongMeta }) => Promise<any>;
        setContentMedia: (payload: { title?: string; mediaPath: string; mediaType: CpMediaType }) => Promise<any>;
        setMode: (mode: CpProjectionMode) => Promise<any>;
        onState: (cb: (state: CpProjectionState) => void) => () => void;
        setAppearance: (payload: { textScale?: number; background?: string; foreground?: string }) => Promise<any>;
      };

      projectionWindow: {
        open: () => Promise<{ isOpen: boolean }>;
        close: () => Promise<{ isOpen: boolean }>;
        isOpen: () => Promise<{ isOpen: boolean }>;
        onWindowState: (cb: (payload: { isOpen: boolean }) => void) => () => void;
      };

      screens: {
        list: () => Promise<CpScreenMeta[]>;
        isOpen: (key: ScreenKey) => Promise<{ isOpen: boolean }>;
        open: (key: ScreenKey) => Promise<{ isOpen: boolean }>;
        close: (key: ScreenKey) => Promise<{ isOpen: boolean }>;
        setMirror: (key: ScreenKey, mirror: ScreenMirrorMode) => Promise<any>;
        getState: (key: ScreenKey) => Promise<CpProjectionState>;
        setContentText: (key: ScreenKey, payload: { title?: string; body: string; metaSong?: CpSongMeta }) => Promise<any>;
        setContentMedia: (key: ScreenKey, payload: { title?: string; mediaPath: string; mediaType: CpMediaType }) => Promise<any>;
        setMode: (key: ScreenKey, mode: CpProjectionMode) => Promise<any>;
        onState: (key: ScreenKey, cb: (state: CpProjectionState) => void) => () => void;
        onWindowState: (key: ScreenKey, cb: (payload: { isOpen: boolean }) => void) => () => void;
      };

      songs: {
        list: (q?: string) => Promise<any[]>;
        get: (id: string) => Promise<any>;
        create: (payload: { title: string; artist?: string; album?: string }) => Promise<any>;
        updateMeta: (payload: { id: string; title: string; artist?: string; album?: string }) => Promise<any>;
        replaceBlocks: (payload: {
          songId: string;
          blocks: Array<{ order: number; type: string; title?: string; content: string }>;
        }) => Promise<any>;
        delete: (id: string) => Promise<any>;
        exportWord: (id: string) => Promise<any>;
        importWord: () => Promise<any>;
        importJson: () => Promise<any>;
        importWordBatch: () => Promise<any>;
        importAuto: () => Promise<any>;
      };

      plans: {
        list: () => Promise<any[]>;
        get: (id: string) => Promise<any>;
        duplicate: (payload: { planId: string; dateIso?: string; title?: string }) => Promise<any>;
        create: (payload: { dateIso: string; title?: string }) => Promise<any>;
        delete: (planId: string) => Promise<any>;
        addItem: (payload: {
          planId: string;
          kind: string;
          title?: string;
          content?: string;
          refId?: string;
          refSubId?: string;
          mediaPath?: string;
        }) => Promise<any>;
        removeItem: (payload: { planId: string; itemId: string }) => Promise<any>;
        reorder: (payload: { planId: string; orderedItemIds: string[] }) => Promise<any>;
        export: (payload: { planId: string }) => Promise<any>;
      };

      data: {
        exportAll: () => Promise<any>;
        importAll: (payload: { mode: "MERGE" | "REPLACE" }) => Promise<any>;
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
        open: (target: "REGIE" | "PROJECTION" | "SCREEN_A" | "SCREEN_B" | "SCREEN_C") => Promise<any>;
      };

      files: {
        pickMedia: () => Promise<{ ok: boolean; canceled?: boolean; path?: string; mediaType?: "IMAGE" | "PDF"; error?: string }>;
        deleteMedia: (payload: { path: string }) => Promise<{ ok: boolean; error?: string }>;
        listMedia: () => Promise<{ ok: boolean; files: Array<{ name: string; path: string; mediaType: "PDF" | "IMAGE" }>; error?: string }>;
      };

      [k: string]: any;
    };
  }
}
