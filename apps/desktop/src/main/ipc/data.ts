import { ipcMain, dialog } from "electron";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "../db";
import fs from "fs";
import type { CpDataImportError } from "../../shared/ipc";
import { parseDataImportPayload } from "./runtimeValidation";

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
  songs?: unknown;
  plans?: unknown;
};

type NormalizedSongBlock = {
  order: number;
  type: string;
  title?: string;
  content: string;
};

type NormalizedSong = {
  title: string;
  artist?: string;
  album?: string;
  language?: string;
  tags?: string;
  blocks: NormalizedSongBlock[];
};

type NormalizedPlanItem = {
  order: number;
  kind: string;
  refId?: string;
  refSubId?: string;
  title?: string;
  content?: string;
  mediaPath?: string;
};

type NormalizedPlan = {
  date?: string | Date;
  title: string;
  items: NormalizedPlanItem[];
};

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return String(err);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asStringLike(value: unknown): string | undefined {
  if (typeof value === "string") return asString(value);
  if (typeof value === "number") return String(value);
  return undefined;
}

function asPositiveInt(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const n = Math.floor(value);
  return n > 0 ? n : fallback;
}

function pushValidationError(errors: CpDataImportError[], message: string, title?: string) {
  errors.push({ kind: "validation", title, message });
}

function normalizeSongs(rawSongs: unknown, errors: CpDataImportError[]): NormalizedSong[] {
  if (rawSongs == null) return [];
  if (!Array.isArray(rawSongs)) {
    pushValidationError(errors, "songs doit etre un tableau");
    return [];
  }

  const songs: NormalizedSong[] = [];
  for (const [songIdx, rawSong] of rawSongs.entries()) {
    if (!isRecord(rawSong)) {
      pushValidationError(errors, `songs[${songIdx}] ignore: objet attendu`);
      continue;
    }
    const s = rawSong as ImportedSong;
    const title = asStringLike(s.title) || "Sans titre";

    const blocksRaw = s.blocks;
    const blocks: NormalizedSongBlock[] = [];
    if (blocksRaw != null) {
      if (!Array.isArray(blocksRaw)) {
        pushValidationError(errors, `songs[${songIdx}].blocks ignore: tableau attendu`, title);
      } else {
        for (const [blockIdx, rawBlock] of blocksRaw.entries()) {
          if (!isRecord(rawBlock)) {
            pushValidationError(errors, `songs[${songIdx}].blocks[${blockIdx}] ignore: objet attendu`, title);
            continue;
          }
          const b = rawBlock as ImportedSongBlock;
          blocks.push({
            order: asPositiveInt(b.order, blockIdx + 1),
            type: asStringLike(b.type) || "VERSE",
            title: asStringLike(b.title),
            content: asStringLike(b.content) || "",
          });
        }
      }
    }

    songs.push({
      title,
      artist: asStringLike(s.artist),
      album: asStringLike(s.album),
      language: asStringLike(s.language),
      tags: asStringLike(s.tags),
      blocks,
    });
  }
  return songs;
}

function normalizePlans(rawPlans: unknown, errors: CpDataImportError[]): NormalizedPlan[] {
  if (rawPlans == null) return [];
  if (!Array.isArray(rawPlans)) {
    pushValidationError(errors, "plans doit etre un tableau");
    return [];
  }

  const plans: NormalizedPlan[] = [];
  for (const [planIdx, rawPlan] of rawPlans.entries()) {
    if (!isRecord(rawPlan)) {
      pushValidationError(errors, `plans[${planIdx}] ignore: objet attendu`);
      continue;
    }
    const p = rawPlan as ImportedPlan;
    const title = asStringLike(p.title) || "Culte";

    if (p.date != null) {
      const parsedDate = new Date(String(p.date));
      if (Number.isNaN(parsedDate.getTime())) {
        pushValidationError(errors, `plans[${planIdx}] ignore: date invalide`, title);
        continue;
      }
    }

    const itemsRaw = p.items;
    const items: NormalizedPlanItem[] = [];
    if (itemsRaw != null) {
      if (!Array.isArray(itemsRaw)) {
        pushValidationError(errors, `plans[${planIdx}].items ignore: tableau attendu`, title);
      } else {
        for (const [itemIdx, rawItem] of itemsRaw.entries()) {
          if (!isRecord(rawItem)) {
            pushValidationError(errors, `plans[${planIdx}].items[${itemIdx}] ignore: objet attendu`, title);
            continue;
          }
          const it = rawItem as ImportedPlanItem;
          items.push({
            order: asPositiveInt(it.order, itemIdx + 1),
            kind: asStringLike(it.kind) || "ANNOUNCEMENT_TEXT",
            refId: asStringLike(it.refId),
            refSubId: asStringLike(it.refSubId),
            title: asStringLike(it.title),
            content: asStringLike(it.content),
            mediaPath: asStringLike(it.mediaPath),
          });
        }
      }
    }

    plans.push({
      date: p.date,
      title,
      items,
    });
  }
  return plans;
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

  ipcMain.handle("data:importAll", async (_evt, rawPayload: unknown) => {
    const prisma = getPrisma();
    const payload = parseDataImportPayload(rawPayload);
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
      if (!isRecord(parsed)) return { ok: false, error: "Invalid JSON structure (object expected)" };
      data = parsed as ImportedDataPayload;
    } catch {
      return { ok: false, error: "Invalid JSON file" };
    }

    const mode = payload.mode || "MERGE";
    const validationErrors: CpDataImportError[] = [];
    const songs = normalizeSongs(data.songs, validationErrors);
    const plans = normalizePlans(data.plans, validationErrors);

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
            for (const b of s.blocks) {
              await tx.songBlock.create({
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
          }

          for (const p of plans) {
            const plan = await tx.servicePlan.create({
              data: {
                date: normalizeDateToMidnight(p.date),
                title: p.title,
              },
            });
            for (const it of p.items) {
              await tx.serviceItem.create({
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
          }

          return { songs: songsImported, plans: plansImported };
        });

        return { ok: true, imported: true, partial: validationErrors.length > 0, counts, errors: validationErrors };
      } catch (e: unknown) {
        return { ok: false, rolledBack: true, error: getErrorMessage(e) };
      }
    }

    const errors: CpDataImportError[] = [...validationErrors];
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
        for (const b of s.blocks) {
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
        for (const it of p.items) {
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
      } catch (e: unknown) {
        errors.push({ kind: "plan", title: p.title, message: getErrorMessage(e) });
      }
    }

    return { ok: true, imported: true, partial: errors.length > 0, counts: { songs: songsImported, plans: plansImported }, errors };
  });
}
