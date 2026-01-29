export {};

declare global {
  type ControlAction = "NEXT" | "PREV";

  interface Window {
    cp: {
      projection: {
        getState: () => Promise<any>;
        setState: (patch: any) => Promise<any>;
        setContentText: (payload: { title?: string; body: string }) => Promise<any>;
        setMode: (mode: "NORMAL" | "BLACK" | "WHITE") => Promise<any>;
        onState: (cb: (state: any) => void) => () => void;

        // NEW: projection window can request prev/next (click/keys)
        emitControl: (action: ControlAction) => void;
        onControl: (cb: (action: ControlAction) => void) => () => void;
      };

      projectionWindow: {
        open: () => Promise<{ isOpen: boolean }>;
        close: () => Promise<{ isOpen: boolean }>;
        isOpen: () => Promise<{ isOpen: boolean }>;
        onWindowState: (cb: (payload: { isOpen: boolean }) => void) => () => void;
      };

      devtools?: {
        open?: (target: "REGIE" | "PROJECTION") => Promise<{ ok: true }>;
      };

      songs: {
        list: (q?: string) => Promise<any[]>;
        get: (id: string) => Promise<any>;
        create: (payload: { title: string; artist?: string; album?: string }) => Promise<any>;
        updateMeta: (payload: { id: string; title: string; artist?: string; album?: string }) => Promise<any>;
        replaceBlocks: (payload: { songId: string; blocks: any[] }) => Promise<any>;
        delete: (id: string) => Promise<any>;
      };

      plans: {
        list: () => Promise<any[]>;
        get: (planId: string) => Promise<any>;
        create: (payload: { dateIso: string; title?: string }) => Promise<any>;
        delete: (planId: string) => Promise<any>;
        addItem: (payload: any) => Promise<any>;
        removeItem: (payload: { planId: string; itemId: string }) => Promise<any>;
        reorder: (payload: { planId: string; orderedItemIds: string[] }) => Promise<any>;
      };
    };
  }
}
