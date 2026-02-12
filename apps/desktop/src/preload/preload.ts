import { contextBridge, ipcRenderer } from "electron";

type ScreenKey = "A" | "B" | "C";
type ScreenMirrorMode = { kind: "FREE" } | { kind: "MIRROR"; from: ScreenKey };
type ProjectionMode = "NORMAL" | "BLACK" | "WHITE";
type MediaType = "IMAGE" | "PDF";
type SongMeta = { title?: string; artist?: string; album?: string; year?: string };
type ProjectionCurrent = {
  kind: "EMPTY" | "TEXT" | "MEDIA";
  title?: string;
  body?: string;
  mediaPath?: string;
  mediaType?: MediaType;
  metaSong?: SongMeta;
};
type ProjectionState = {
  mode: ProjectionMode;
  lowerThirdEnabled: boolean;
  transitionEnabled: boolean;
  textScale: number;
  background: string;
  foreground: string;
  current: ProjectionCurrent;
  updatedAt: number;
};
type LiveState = {
  enabled: boolean;
  planId: string | null;
  cursor: number;
  target: ScreenKey;
  black: boolean;
  white: boolean;
  lockedScreens: Record<ScreenKey, boolean>;
  updatedAt: number;
};

contextBridge.exposeInMainWorld("cp", {
  // Backward compatible API (A only)
  projection: {
    getState: () => ipcRenderer.invoke("projection:getState"),
    setState: (patch: Partial<ProjectionState>) => ipcRenderer.invoke("projection:setState", patch),
    setAppearance: (payload: { textScale?: number; background?: string; foreground?: string }) =>
      ipcRenderer.invoke("projection:setAppearance", payload),
    setContentText: (payload: { title?: string; body: string; metaSong?: SongMeta }) =>
      ipcRenderer.invoke("projection:setContentText", payload),
    setContentMedia: (payload: { title?: string; mediaPath: string; mediaType: MediaType }) =>
      ipcRenderer.invoke("projection:setContentMedia", payload),
    setMode: (mode: ProjectionMode) =>
      ipcRenderer.invoke("projection:setMode", mode),
    onState: (cb: (state: ProjectionState) => void) => {
      const handler = (_: unknown, payload: { key: ScreenKey; state: ProjectionState }) => {
        if (payload?.key === "A") cb(payload.state);
      };
      ipcRenderer.on("screens:state", handler);
      return () => ipcRenderer.removeListener("screens:state", handler);
    },
  },

  // Window control for A (legacy)
  projectionWindow: {
    open: () => ipcRenderer.invoke("projectionWindow:open"),
    close: () => ipcRenderer.invoke("projectionWindow:close"),
    isOpen: () => ipcRenderer.invoke("projectionWindow:isOpen"),
    onWindowState: (cb: (payload: { isOpen: boolean }) => void) => {
      const handler = (_: unknown, payload: { key: ScreenKey; isOpen: boolean }) => {
        if (payload?.key === "A") cb({ isOpen: payload.isOpen });
      };
      ipcRenderer.on("screens:window", handler);
      return () => ipcRenderer.removeListener("screens:window", handler);
    },
  },

  // New multi-screen API
  screens: {
    list: () => ipcRenderer.invoke("screens:list"),
    isOpen: (key: ScreenKey) => ipcRenderer.invoke("screens:isOpen", key),
    open: (key: ScreenKey) => ipcRenderer.invoke("screens:open", key),
    close: (key: ScreenKey) => ipcRenderer.invoke("screens:close", key),
    setMirror: (key: ScreenKey, mirror: ScreenMirrorMode) =>
      ipcRenderer.invoke("screens:setMirror", key, mirror),
    getState: (key: ScreenKey) => ipcRenderer.invoke("screens:getState", key),
    setContentText: (key: ScreenKey, payload: { title?: string; body: string; metaSong?: SongMeta }) =>
      ipcRenderer.invoke("screens:setContentText", key, payload),
    setContentMedia: (key: ScreenKey, payload: { title?: string; mediaPath: string; mediaType: MediaType }) =>
      ipcRenderer.invoke("screens:setContentMedia", key, payload),
    setMode: (key: ScreenKey, mode: ProjectionMode) =>
      ipcRenderer.invoke("screens:setMode", key, mode),
    onState: (key: ScreenKey, cb: (state: ProjectionState) => void) => {
      const handler = (_: unknown, payload: { key: ScreenKey; state: ProjectionState }) => {
        if (payload?.key === key) cb(payload.state);
      };
      ipcRenderer.on("screens:state", handler);
      return () => ipcRenderer.removeListener("screens:state", handler);
    },
    onWindowState: (key: ScreenKey, cb: (payload: { isOpen: boolean }) => void) => {
      const handler = (_: unknown, payload: { key: ScreenKey; isOpen: boolean }) => {
        if (payload?.key === key) cb({ isOpen: payload.isOpen });
      };
      ipcRenderer.on("screens:window", handler);
      return () => ipcRenderer.removeListener("screens:window", handler);
    },
  },

  songs: {
    list: (q?: string) => ipcRenderer.invoke("songs:list", q),
    get: (id: string) => ipcRenderer.invoke("songs:get", id),
    create: (payload: { title: string; artist?: string; album?: string }) => ipcRenderer.invoke("songs:create", payload),
    updateMeta: (payload: { id: string; title: string; artist?: string; album?: string }) =>
      ipcRenderer.invoke("songs:updateMeta", payload),
    replaceBlocks: (payload: {
      songId: string;
      blocks: Array<{ order: number; type: string; title?: string; content: string }>;
    }) => ipcRenderer.invoke("songs:replaceBlocks", payload),
    delete: (id: string) => ipcRenderer.invoke("songs:delete", id),
    exportWord: (id: string) => ipcRenderer.invoke("songs:exportWord", id),
    importWord: () => ipcRenderer.invoke("songs:importWord"),
    importJson: () => ipcRenderer.invoke("songs:importJson"),
    importWordBatch: () => ipcRenderer.invoke("songs:importWordBatch"),
    importAuto: () => ipcRenderer.invoke("songs:importAuto"),
  },

  plans: {
    list: () => ipcRenderer.invoke("plans:list"),
    get: (id: string) => ipcRenderer.invoke("plans:get", id),
    duplicate: (payload: { planId: string; dateIso?: string; title?: string }) => ipcRenderer.invoke("plans:duplicate", payload),
    create: (payload: { dateIso: string; title?: string }) => ipcRenderer.invoke("plans:create", payload),
    delete: (planId: string) => ipcRenderer.invoke("plans:delete", planId),
    addItem: (payload: {
      planId: string;
      kind: string;
      title?: string;
      content?: string;
      refId?: string;
      refSubId?: string;
      mediaPath?: string;
    }) => ipcRenderer.invoke("plans:addItem", payload),
    removeItem: (payload: { planId: string; itemId: string }) => ipcRenderer.invoke("plans:removeItem", payload),
    reorder: (payload: { planId: string; orderedItemIds: string[] }) => ipcRenderer.invoke("plans:reorder", payload),
    export: (payload: { planId: string }) => ipcRenderer.invoke("plans:export", payload),
  },

  data: {
    exportAll: () => ipcRenderer.invoke("data:exportAll"),
    importAll: (payload: { mode: "MERGE" | "REPLACE" }) => ipcRenderer.invoke("data:importAll", payload),
  },

  bible: {
    listTranslations: () => ipcRenderer.invoke("bible:listTranslations"),
  },


  // -----------------------
  // Live sync between pages (Regie <-> Plan)
  // -----------------------
  live: {
    get: () => ipcRenderer.invoke("live:get"),
    set: (payload: { planId?: string | null; cursor?: number | null; enabled?: boolean; target?: ScreenKey; black?: boolean; white?: boolean }) =>
      ipcRenderer.invoke("live:set", payload),
    next: () => ipcRenderer.invoke("live:next"),
    prev: () => ipcRenderer.invoke("live:prev"),
    setCursor: (cursor: number) => ipcRenderer.invoke("live:setCursor", cursor),
    setTarget: (target: ScreenKey) => ipcRenderer.invoke("live:setTarget", target),
    toggle: () => ipcRenderer.invoke("live:toggle"),
    toggleBlack: () => ipcRenderer.invoke("live:toggleBlack"),
    toggleWhite: () => ipcRenderer.invoke("live:toggleWhite"),
    resume: () => ipcRenderer.invoke("live:resume"),
    setLocked: (key: ScreenKey, locked: boolean) => ipcRenderer.invoke("live:setLocked", { key, locked }),
    onUpdate: (cb: (state: LiveState) => void) => {
      const handler = (_: unknown, payload: LiveState) => cb(payload);
      ipcRenderer.on("live:update", handler);
      return () => ipcRenderer.removeListener("live:update", handler);
    },
  },

  devtools: {
    open: (target: "REGIE" | "PROJECTION" | "SCREEN_A" | "SCREEN_B" | "SCREEN_C") =>
      ipcRenderer.invoke("devtools:open", target),
  },

  files: {
    pickMedia: () => ipcRenderer.invoke("files:pickMedia"),
    listMedia: () => ipcRenderer.invoke("files:listMedia"),
    deleteMedia: (payload: { path: string }) => ipcRenderer.invoke("files:deleteMedia", payload),
  },
});
