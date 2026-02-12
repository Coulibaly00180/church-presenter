import { ipcMain } from "electron";

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function registerBibleIpc() {
  ipcMain.handle("bible:listTranslations", async () => {
    try {
      const r = await fetch("https://bolls.life/static/bolls/app/views/languages.json");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      return { ok: true, data: json };
    } catch (e: unknown) {
      return { ok: false, error: getErrorMessage(e) };
    }
  });
}
