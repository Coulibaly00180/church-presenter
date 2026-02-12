import { ipcMain, dialog } from "electron";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "../db";
import fs from "fs";

type ImportedSongBlock = {
  order?: number;
  type?: string;
  title?: string;
  content?: string;
};

type ImportedSong = {
  title?: string;
  artist?: string;
  album?: string;
  language?: string;
  tags?: string;
  blocks?: ImportedSongBlock[];
};

type ImportedPlanItem = {
  order?: number;
  kind?: string;
  refId?: string;
  refSubId?: string;
  title?: string;
  content?: string;
  mediaPath?: string;
};

type ImportedPlan = {
  date?: string | Date;
  title?: string;
  items?: ImportedPlanItem[];
};

type ImportedDataPayload = {
  songs?: ImportedSong[];
  plans?: ImportedPlan[];
};

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return String(err);
}

function normalizeDateToMidnight(dateIso?: string | Date) {
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
    let data: ImportedDataPayload;
    try {
      const parsed = JSON.parse(raw) as unknown;
      data = typeof parsed === "object" && parsed !== null ? (parsed as ImportedDataPayload) : {};
    } catch {
      return { ok: false, error: "Invalid JSON file" };
    }

    const mode = payload?.mode || "MERGE";
    const songs = Array.isArray(data.songs) ? data.songs : [];
    const plans = Array.isArray(data.plans) ? data.plans : [];

    if (mode === "REPLACE") {
      try {
        const counts = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          await tx.songBlock.deleteMany({});
          await tx.song.deleteMany({});
          await tx.serviceItem.deleteMany({});
          await tx.servicePlan.deleteMany({});

          let songsImported = 0;
          let plansImported = 0;

          for (const s of songs) {
            const song = await tx.song.create({
              data: {
                title: s.title || "Sans titre",
                artist: s.artist,
                album: s.album,
                language: s.language,
                tags: s.tags,
              },
            });
            for (const b of s.blocks || []) {
              await tx.songBlock.create({
                data: {
                  songId: song.id,
                  order: b.order ?? 1,
                  type: b.type ?? "VERSE",
                  title: b.title,
                  content: b.content ?? "",
                },
              });
            }
            songsImported += 1;
          }

          for (const p of plans) {
            const plan = await tx.servicePlan.create({
              data: {
                date: normalizeDateToMidnight(p.date),
                title: p.title,
              },
            });
            for (const it of p.items || []) {
              await tx.serviceItem.create({
                data: {
                  planId: plan.id,
                  order: it.order ?? 1,
                  kind: it.kind ?? "ANNOUNCEMENT_TEXT",
                  refId: it.refId,
                  refSubId: it.refSubId,
                  title: it.title,
                  content: it.content,
                  mediaPath: it.mediaPath,
                },
              });
            }
            plansImported += 1;
          }

          return { songs: songsImported, plans: plansImported };
        });

        return { ok: true, imported: true, counts, errors: [] };
      } catch (e: unknown) {
        return { ok: false, rolledBack: true, error: getErrorMessage(e) };
      }
    }

    const errors: Array<{ kind: string; title?: string; message: string }> = [];
    let songsImported = 0;
    let plansImported = 0;

    for (const s of songs) {
      try {
        const song = await prisma.song.create({
          data: {
            title: s.title || "Sans titre",
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
              order: b.order ?? 1,
              type: b.type ?? "VERSE",
              title: b.title,
              content: b.content ?? "",
            },
          });
        }
        songsImported += 1;
      } catch (e: unknown) {
        errors.push({ kind: "song", title: s.title, message: getErrorMessage(e) });
      }
    }

    for (const p of plans) {
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
              order: it.order ?? 1,
              kind: it.kind ?? "ANNOUNCEMENT_TEXT",
              refId: it.refId,
              refSubId: it.refSubId,
              title: it.title,
              content: it.content,
              mediaPath: it.mediaPath,
            },
          });
        }
        plansImported += 1;
      } catch (e: unknown) {
        errors.push({ kind: "plan", title: p.title, message: getErrorMessage(e) });
      }
    }

    return { ok: true, imported: true, partial: errors.length > 0, counts: { songs: songsImported, plans: plansImported }, errors };
  });
}
