export {};

declare global {
  type ScreenKey = "A" | "B" | "C";
  type ScreenMirrorMode = { kind: "FREE" } | { kind: "MIRROR"; from: ScreenKey };

  interface Window {
    cp: {
      projection: {
        getState: () => Promise<any>;
        setState: (patch: any) => Promise<any>;
        setContentText: (payload: { title?: string; body: string }) => Promise<any>;
        setContentMedia: (payload: { title?: string; mediaPath: string; mediaType: "IMAGE" | "PDF" }) => Promise<any>;
        setMode: (mode: "NORMAL" | "BLACK" | "WHITE") => Promise<any>;
        onState: (cb: (state: any) => void) => () => void;
      };

      projectionWindow?: {
        open: () => Promise<{ isOpen: boolean }>;
        close: () => Promise<{ isOpen: boolean }>;
        isOpen: () => Promise<{ isOpen: boolean }>;
        onWindowState: (cb: (payload: { isOpen: boolean }) => void) => () => void;
      };

      screens?: {
        list: () => Promise<Array<{ key: ScreenKey; isOpen: boolean; mirror: ScreenMirrorMode }>>;
        isOpen: (key: ScreenKey) => Promise<{ isOpen: boolean }>;
        open: (key: ScreenKey) => Promise<{ isOpen: boolean }>;
        close: (key: ScreenKey) => Promise<{ isOpen: boolean }>;
        setMirror: (key: ScreenKey, mirror: ScreenMirrorMode) => Promise<any>;
        getState: (key: ScreenKey) => Promise<any>;
        setContentText: (key: ScreenKey, payload: { title?: string; body: string }) => Promise<any>;
        setContentMedia: (key: ScreenKey, payload: { title?: string; mediaPath: string; mediaType: "IMAGE" | "PDF" }) => Promise<any>;
        setMode: (key: ScreenKey, mode: "NORMAL" | "BLACK" | "WHITE") => Promise<any>;
        onState: (key: ScreenKey, cb: (state: any) => void) => () => void;
        onWindowState: (key: ScreenKey, cb: (payload: { isOpen: boolean }) => void) => () => void;
      };

      songs?: {
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
      };

      plans?: {
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

      data?: {
        exportAll: () => Promise<any>;
        importAll: () => Promise<any>;
      };

      live?: {
        get: () => Promise<{
          enabled: boolean;
          planId: string | null;
          cursor: number;
          target: ScreenKey;
          black: boolean;
          white: boolean;
          lockedScreens: Record<ScreenKey, boolean>;
          updatedAt: number;
        }>;
        set: (payload: { planId?: string | null; cursor?: number | null; enabled?: boolean; target?: ScreenKey; black?: boolean; white?: boolean }) => Promise<any>;
        next: () => Promise<any>;
        prev: () => Promise<any>;
        setCursor: (cursor: number) => Promise<any>;
        setTarget: (target: ScreenKey) => Promise<any>;
        toggle: () => Promise<any>;
        toggleBlack: () => Promise<any>;
        toggleWhite: () => Promise<any>;
        resume: () => Promise<any>;
        setLocked: (key: ScreenKey, locked: boolean) => Promise<any>;
        onUpdate: (cb: (state: any) => void) => () => void;
      };


      devtools?: {
        open: (target: "REGIE" | "PROJECTION" | "SCREEN_A" | "SCREEN_B" | "SCREEN_C") => Promise<any>;
      };

      files?: {
        pickMedia: () => Promise<{ ok: boolean; canceled?: boolean; path?: string; mediaType?: "IMAGE" | "PDF" }>;
      };

      [k: string]: any;
    };
  }
}
