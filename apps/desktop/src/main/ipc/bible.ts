import { ipcMain } from "electron";

export function registerBibleIpc() {
  ipcMain.handle("bible:listTranslations", async () => {
    try {
      const r = await fetch("https://bolls.life/static/bolls/app/views/languages.json");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      return { ok: true, data: json };
    } catch (e: any) {
      return { ok: false, error: e?.message || String(e) };
    }
  });
}
