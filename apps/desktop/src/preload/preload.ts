import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("cp", {
  projection: {
    getState: () => ipcRenderer.invoke("projection:getState"),
    setState: (patch: any) => ipcRenderer.invoke("projection:setState", patch),
    setContentText: (payload: { title?: string; body: string }) =>
      ipcRenderer.invoke("projection:setContentText", payload),
    setMode: (mode: "NORMAL" | "BLACK" | "WHITE") =>
      ipcRenderer.invoke("projection:setMode", mode),
    onState: (cb: (state: any) => void) => {
      const handler = (_: any, state: any) => cb(state);
      ipcRenderer.on("projection:state", handler);
      return () => ipcRenderer.removeListener("projection:state", handler);
    }
  },

  projectionWindow: {
    open: () => ipcRenderer.invoke("projectionWindow:open"),
    close: () => ipcRenderer.invoke("projectionWindow:close"),
    isOpen: () => ipcRenderer.invoke("projectionWindow:isOpen"),
    onWindowState: (cb: (payload: { isOpen: boolean }) => void) => {
      const handler = (_: any, payload: { isOpen: boolean }) => cb(payload);
      ipcRenderer.on("projection:window", handler);
      return () => ipcRenderer.removeListener("projection:window", handler);
    }
  },

  devtools: {
    open: (target: "REGIE" | "PROJECTION") => ipcRenderer.invoke("devtools:open", target)
  },

  songs: {
    list: (q?: string) => ipcRenderer.invoke("songs:list", q),
    get: (id: string) => ipcRenderer.invoke("songs:get", id),
    create: (payload: { title: string; artist?: string; album?: string }) =>
      ipcRenderer.invoke("songs:create", payload),
    updateMeta: (payload: { id: string; title: string; artist?: string; album?: string }) =>
      ipcRenderer.invoke("songs:updateMeta", payload),
    replaceBlocks: (payload: { songId: string; blocks: any[] }) =>
      ipcRenderer.invoke("songs:replaceBlocks", payload),
    delete: (id: string) => ipcRenderer.invoke("songs:delete", id),
  },

  plans: {
  list: () => ipcRenderer.invoke("plans:list"),
  get: (planId: string) => ipcRenderer.invoke("plans:get", planId),
  create: (payload: { dateIso: string; title?: string }) => ipcRenderer.invoke("plans:create", payload),
  delete: (planId: string) => ipcRenderer.invoke("plans:delete", planId),
  addItem: (payload: any) => ipcRenderer.invoke("plans:addItem", payload),
  removeItem: (payload: { planId: string; itemId: string }) => ipcRenderer.invoke("plans:removeItem", payload),
  reorder: (payload: { planId: string; orderedItemIds: string[] }) => ipcRenderer.invoke("plans:reorder", payload),
},
});
