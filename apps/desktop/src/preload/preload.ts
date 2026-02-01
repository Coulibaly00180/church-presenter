import { contextBridge, ipcRenderer } from "electron";

type ScreenKey = "A" | "B" | "C";
type ScreenMirrorMode = { kind: "FREE" } | { kind: "MIRROR"; from: ScreenKey };

contextBridge.exposeInMainWorld("cp", {
  // Backward compatible API (A only)
  projection: {
    getState: () => ipcRenderer.invoke("projection:getState"),
    setState: (patch: any) => ipcRenderer.invoke("projection:setState", patch),
    setContentText: (payload: { title?: string; body: string }) =>
      ipcRenderer.invoke("projection:setContentText", payload),
    setMode: (mode: "NORMAL" | "BLACK" | "WHITE") =>
      ipcRenderer.invoke("projection:setMode", mode),
    onState: (cb: (state: any) => void) => {
      const handler = (_: any, payload: { key: ScreenKey; state: any }) => {
        if (payload?.key === "A") cb(payload.state);
      };
      ipcRenderer.on("screens:state", handler);
      return () => ipcRenderer.removeListener("screens:state", handler);
    },
  },

    control: (action: "NEXT" | "PREV", screen?: ScreenKey) =>
      ipcRenderer.send("projection:control", { action, screen }),

    onControl: (cb: (payload: { action: "NEXT" | "PREV"; screen?: ScreenKey }) => void) => {
      const handler = (_: any, payload: { action: "NEXT" | "PREV"; screen?: ScreenKey }) => cb(payload);
      ipcRenderer.on("projection:control", handler);
      return () => ipcRenderer.removeListener("projection:control", handler);
    },

  },

  // Window control for A (legacy)
  projectionWindow: {
    open: () => ipcRenderer.invoke("projectionWindow:open"),
    close: () => ipcRenderer.invoke("projectionWindow:close"),
    isOpen: () => ipcRenderer.invoke("projectionWindow:isOpen"),
    onWindowState: (cb: (payload: { isOpen: boolean }) => void) => {
      const handler = (_: any, payload: { key: ScreenKey; isOpen: boolean }) => {
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
    setContentText: (key: ScreenKey, payload: { title?: string; body: string }) =>
      ipcRenderer.invoke("screens:setContentText", key, payload),
    setMode: (key: ScreenKey, mode: "NORMAL" | "BLACK" | "WHITE") =>
      ipcRenderer.invoke("screens:setMode", key, mode),
    onState: (key: ScreenKey, cb: (state: any) => void) => {
      const handler = (_: any, payload: { key: ScreenKey; state: any }) => {
        if (payload?.key === key) cb(payload.state);
      };
      ipcRenderer.on("screens:state", handler);
      return () => ipcRenderer.removeListener("screens:state", handler);
    },
    onWindowState: (key: ScreenKey, cb: (payload: { isOpen: boolean }) => void) => {
      const handler = (_: any, payload: { key: ScreenKey; isOpen: boolean }) => {
        if (payload?.key === key) cb({ isOpen: payload.isOpen });
      };
      ipcRenderer.on("screens:window", handler);
      return () => ipcRenderer.removeListener("screens:window", handler);
    },
  },

  devtools: {
    open: (target: "REGIE" | "PROJECTION" | "SCREEN_A" | "SCREEN_B" | "SCREEN_C") =>
      ipcRenderer.invoke("devtools:open", target),
  },
});
