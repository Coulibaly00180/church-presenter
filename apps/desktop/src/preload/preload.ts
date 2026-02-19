import { contextBridge, ipcRenderer } from "electron";
import type {
  CpApi,
  CpDataImportAtomicity,
  CpDataImportMode,
  CpDevtoolsTarget,
  CpLiveSetPayload,
  CpLiveState,
  CpPlanAddItemPayload,
  CpPlanCreatePayload,
  CpPlanDuplicatePayload,
  CpPlanExportPayload,
  CpPlanRemoveItemPayload,
  CpPlanReorderPayload,
  CpPlanUpdatePayload,
  CpPlanUpdateItemPayload,
  CpProjectionMode,
  CpProjectionSetAppearancePayload,
  CpProjectionSetMediaPayload,
  CpProjectionSetTextPayload,
  CpProjectionState,
  CpScreenStateEventPayload,
  CpScreenWindowEventPayload,
  CpSyncStatus,
  ScreenKey,
  ScreenMirrorMode,
} from "../shared/ipc";

type ProjectionState = CpProjectionState;

const cpApi: CpApi = {
  // Backward compatible API (A only)
  projection: {
    getState: () => ipcRenderer.invoke("projection:getState"),
    setState: (patch: Partial<ProjectionState>) => ipcRenderer.invoke("projection:setState", patch),
    setAppearance: (payload: CpProjectionSetAppearancePayload) =>
      ipcRenderer.invoke("projection:setAppearance", payload),
    setContentText: (payload: CpProjectionSetTextPayload) =>
      ipcRenderer.invoke("projection:setContentText", payload),
    setContentMedia: (payload: CpProjectionSetMediaPayload) =>
      ipcRenderer.invoke("projection:setContentMedia", payload),
    setMode: (mode: CpProjectionMode) =>
      ipcRenderer.invoke("projection:setMode", mode),
    onState: (cb: (state: ProjectionState) => void) => {
      const handler = (_: unknown, payload: CpScreenStateEventPayload) => {
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
      const handler = (_: unknown, payload: CpScreenWindowEventPayload) => {
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
    setContentText: (key: ScreenKey, payload: CpProjectionSetTextPayload) =>
      ipcRenderer.invoke("screens:setContentText", key, payload),
    setContentMedia: (key: ScreenKey, payload: CpProjectionSetMediaPayload) =>
      ipcRenderer.invoke("screens:setContentMedia", key, payload),
    setMode: (key: ScreenKey, mode: CpProjectionMode) =>
      ipcRenderer.invoke("screens:setMode", key, mode),
    setAppearance: (key: ScreenKey, payload: CpProjectionSetAppearancePayload) =>
      ipcRenderer.invoke("screens:setAppearance", key, payload),
    onState: (key: ScreenKey, cb: (state: ProjectionState) => void) => {
      const handler = (_: unknown, payload: CpScreenStateEventPayload) => {
        if (payload?.key === key) cb(payload.state);
      };
      ipcRenderer.on("screens:state", handler);
      return () => ipcRenderer.removeListener("screens:state", handler);
    },
    onWindowState: (key: ScreenKey, cb: (payload: { isOpen: boolean }) => void) => {
      const handler = (_: unknown, payload: CpScreenWindowEventPayload) => {
        if (payload?.key === key) cb({ isOpen: payload.isOpen });
      };
      ipcRenderer.on("screens:window", handler);
      return () => ipcRenderer.removeListener("screens:window", handler);
    },
  },

  songs: {
    list: (q?: string) => ipcRenderer.invoke("songs:list", q),
    get: (id: string) => ipcRenderer.invoke("songs:get", id),
    create: (payload: { title: string; artist?: string; album?: string; year?: string }) => ipcRenderer.invoke("songs:create", payload),
    updateMeta: (payload: { id: string; title: string; artist?: string; album?: string; year?: string }) =>
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
    duplicate: (payload: CpPlanDuplicatePayload) => ipcRenderer.invoke("plans:duplicate", payload),
    create: (payload: CpPlanCreatePayload) => ipcRenderer.invoke("plans:create", payload),
    update: (payload: CpPlanUpdatePayload) => ipcRenderer.invoke("plans:update", payload),
    delete: (planId: string) => ipcRenderer.invoke("plans:delete", planId),
    addItem: (payload: CpPlanAddItemPayload) => ipcRenderer.invoke("plans:addItem", payload),
    updateItem: (payload: CpPlanUpdateItemPayload) => ipcRenderer.invoke("plans:updateItem", payload),
    removeItem: (payload: CpPlanRemoveItemPayload) => ipcRenderer.invoke("plans:removeItem", payload),
    reorder: (payload: CpPlanReorderPayload) => ipcRenderer.invoke("plans:reorder", payload),
    export: (payload: CpPlanExportPayload) => ipcRenderer.invoke("plans:export", payload),
    importFromFile: (planId: string) => ipcRenderer.invoke("plans:importFromFile", planId),
  },

  data: {
    exportAll: () => ipcRenderer.invoke("data:exportAll"),
    importAll: (payload: { mode: CpDataImportMode; atomicity?: CpDataImportAtomicity }) => ipcRenderer.invoke("data:importAll", payload),
  },

  bible: {
    listTranslations: () => ipcRenderer.invoke("bible:listTranslations"),
  },


  // -----------------------
  // Live sync between pages (Regie <-> Plan)
  // -----------------------
  live: {
    get: () => ipcRenderer.invoke("live:get"),
    set: (payload: CpLiveSetPayload) =>
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
    onUpdate: (cb: (state: CpLiveState) => void) => {
      const handler = (_: unknown, payload: CpLiveState) => cb(payload);
      ipcRenderer.on("live:update", handler);
      return () => ipcRenderer.removeListener("live:update", handler);
    },
  },

  sync: {
    start: (port?: number) => ipcRenderer.invoke("sync:start", port),
    stop: () => ipcRenderer.invoke("sync:stop"),
    status: () => ipcRenderer.invoke("sync:status"),
    onStatusChange: (cb: (status: CpSyncStatus) => void) => {
      const handler = (_: unknown, payload: CpSyncStatus) => cb(payload);
      ipcRenderer.on("sync:status", handler);
      return () => ipcRenderer.removeListener("sync:status", handler);
    },
  },

  devtools: {
    open: (target: CpDevtoolsTarget) =>
      ipcRenderer.invoke("devtools:open", target),
  },

  diagnostics: {
    getState: () => ipcRenderer.invoke("diagnostics:getState"),
  },

  files: {
    pickMedia: () => ipcRenderer.invoke("files:pickMedia"),
    pickFont: () => ipcRenderer.invoke("files:pickFont"),
    validateFont: (payload: { path: string }) => ipcRenderer.invoke("files:validateFont", payload),
    listMedia: () => ipcRenderer.invoke("files:listMedia"),
    deleteMedia: (payload: { path: string }) => ipcRenderer.invoke("files:deleteMedia", payload),
    renameMedia: (payload: { path: string; name: string }) => ipcRenderer.invoke("files:renameMedia", payload),
    chooseLibraryDir: () => ipcRenderer.invoke("files:chooseLibraryDir"),
    getLibraryDir: () => ipcRenderer.invoke("files:getLibraryDir"),
    readMedia: (payload: { path: string }) => ipcRenderer.invoke("files:readMedia", payload),
  },

  settings: {
    getTheme: () => ipcRenderer.invoke("settings:getTheme"),
    setTheme: (theme) => ipcRenderer.invoke("settings:setTheme", theme),
    getShortcuts: () => ipcRenderer.invoke("settings:getShortcuts"),
    setShortcuts: (shortcuts) => ipcRenderer.invoke("settings:setShortcuts", shortcuts),
    getTemplates: () => ipcRenderer.invoke("settings:getTemplates"),
    setTemplates: (templates) => ipcRenderer.invoke("settings:setTemplates", templates),
    getProfiles: () => ipcRenderer.invoke("settings:getProfiles"),
    createProfile: (payload: { name: string }) => ipcRenderer.invoke("settings:createProfile", payload),
    activateProfile: (payload: { profileId: string }) => ipcRenderer.invoke("settings:activateProfile", payload),
    renameProfile: (payload: { profileId: string; name: string }) => ipcRenderer.invoke("settings:renameProfile", payload),
    saveActiveProfile: () => ipcRenderer.invoke("settings:saveActiveProfile"),
    deleteProfile: (payload: { profileId: string }) => ipcRenderer.invoke("settings:deleteProfile", payload),
  },
};

contextBridge.exposeInMainWorld("cp", cpApi);
