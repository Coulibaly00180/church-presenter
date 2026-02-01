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
        setMode: (mode: "NORMAL" | "BLACK" | "WHITE") => Promise<any>;
        onState: (cb: (state: any) => void) => () => void;
      };

      projectionWindow: {
        open: () => Promise<{ isOpen: boolean }>;
        close: () => Promise<{ isOpen: boolean }>;
        isOpen: () => Promise<{ isOpen: boolean }>;
        onWindowState: (cb: (payload: { isOpen: boolean }) => void) => () => void;
      };

      screens: {
        list: () => Promise<Array<{ key: ScreenKey; isOpen: boolean; mirror: ScreenMirrorMode }>>;
        isOpen: (key: ScreenKey) => Promise<{ isOpen: boolean }>;
        open: (key: ScreenKey) => Promise<{ isOpen: boolean }>;
        close: (key: ScreenKey) => Promise<{ isOpen: boolean }>;
        setMirror: (key: ScreenKey, mirror: ScreenMirrorMode) => Promise<any>;
        getState: (key: ScreenKey) => Promise<any>;
        setContentText: (key: ScreenKey, payload: { title?: string; body: string }) => Promise<any>;
        setMode: (key: ScreenKey, mode: "NORMAL" | "BLACK" | "WHITE") => Promise<any>;
        onState: (key: ScreenKey, cb: (state: any) => void) => () => void;
        onWindowState: (key: ScreenKey, cb: (payload: { isOpen: boolean }) => void) => () => void;
      };

      songs: {
        list: (q?: string) => Promise<Array<{ id: string; title: string; artist?: string; album?: string; updatedAt: string }>>;
        get: (id: string) => Promise<any>;
        create: (payload: { title: string; artist?: string; album?: string }) => Promise<any>;
        updateMeta: (payload: { id: string; title: string; artist?: string; album?: string }) => Promise<any>;
        replaceBlocks: (payload: { songId: string; blocks: any[] }) => Promise<any>;
        delete: (id: string) => Promise<{ ok: true }>;
      };

      plans: {
        list: () => Promise<any[]>;
        get: (id: string) => Promise<any>;
        createForDate: (payload: { dateIso: string; title?: string }) => Promise<any>;
        updateMeta: (payload: { id: string; dateIso: string; title?: string }) => Promise<any>;
        setItems: (payload: { id: string; items: any[] }) => Promise<any>;
      };

      devtools: {
        open: (target: "REGIE" | "PROJECTION" | "SCREEN_A" | "SCREEN_B" | "SCREEN_C") => Promise<any>;
      };
    };
  }
}
