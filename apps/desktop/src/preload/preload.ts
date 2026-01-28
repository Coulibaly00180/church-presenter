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
  }
});
