import { ipcMain, dialog } from "electron";
import { getPrisma } from "../db";
import fs from "fs";

function normalizeDateToMidnight(dateIso?: string) {
  if (!dateIso) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  }
  const ymd = String(dateIso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 0, 0, 0, 0));
  }
  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid plan date");
  }
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0));
}

export function registerDataIpc() {
  ipcMain.handle("data:exportAll", async () => {
    const prisma = getPrisma();
    const payload = {
      songs: await prisma.song.findMany({ include: { blocks: { orderBy: { order: "asc" } } } }),
      plans: await prisma.servicePlan.findMany({ include: { items: { orderBy: { order: "asc" } } } }),
      exportedAt: new Date().toISOString(),
    };

    const res = await dialog.showSaveDialog({
      title: "Exporter la base",
      defaultPath: "church-presenter.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (res.canceled || !res.filePath) return { ok: false, canceled: true };
    fs.writeFileSync(res.filePath, JSON.stringify(payload, null, 2), "utf-8");
    return { ok: true, path: res.filePath };
  });

  ipcMain.handle("data:importAll", async (_evt, payload: { mode: "MERGE" | "REPLACE" }) => {
    const prisma = getPrisma();
    const res = await dialog.showOpenDialog({
      title: "Importer une base",
      filters: [{ name: "JSON", extensions: ["json"] }],
      properties: ["openFile"],
    });
    if (res.canceled || !res.filePaths?.[0]) return { ok: false, canceled: true };
    const path = res.filePaths[0];
    const raw = fs.readFileSync(path, "utf-8");
    const data = JSON.parse(raw);

    const mode = payload?.mode || "MERGE";
    const errors: Array<{ kind: string; title?: string; message: string }> = [];
    let songsImported = 0;
    let plansImported = 0;

    if (mode === "REPLACE") {
      await prisma.songBlock.deleteMany({});
      await prisma.song.deleteMany({});
      await prisma.serviceItem.deleteMany({});
      await prisma.servicePlan.deleteMany({});
    }

    for (const s of data.songs || []) {
      try {
        const song = await prisma.song.create({
          data: {
            title: s.title,
            artist: s.artist,
            album: s.album,
            language: s.language,
            tags: s.tags,
          },
        });
        for (const b of s.blocks || []) {
          await prisma.songBlock.create({
            data: {
              songId: song.id,
              order: b.order,
              type: b.type,
              title: b.title,
              content: b.content,
            },
          });
        }
        songsImported += 1;
      } catch (e: any) {
        errors.push({ kind: "song", title: s.title, message: e?.message || String(e) });
      }
    }

    for (const p of data.plans || []) {
      try {
        const plan = await prisma.servicePlan.create({
          data: {
            date: normalizeDateToMidnight(p.date),
            title: p.title,
          },
        });
        for (const it of p.items || []) {
          await prisma.serviceItem.create({
            data: {
              planId: plan.id,
              order: it.order,
              kind: it.kind,
              refId: it.refId,
              refSubId: it.refSubId,
              title: it.title,
              content: it.content,
              mediaPath: it.mediaPath,
            },
          });
        }
        plansImported += 1;
      } catch (e: any) {
        errors.push({ kind: "plan", title: p.title, message: e?.message || String(e) });
      }
    }

    return { ok: true, imported: true, counts: { songs: songsImported, plans: plansImported }, errors };
  });
}
