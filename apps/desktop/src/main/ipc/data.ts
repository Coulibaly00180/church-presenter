import { app, ipcMain, dialog } from "electron";
import type { Prisma } from "@prisma/client";
import { databasePathFromUrl, getPrisma } from "../db";
import { copyFile, mkdir, readdir, readFile, stat, unlink, writeFile } from "fs/promises";
import { basename, dirname, join } from "path";
import type { CpDataFileV2, CpDataImportError } from "../../shared/ipc";
import type { CpPlanItemKind } from "../../shared/planKinds";
import { isCpPlanItemKind, normalizeCpPlanItemKind } from "../../shared/planKinds";
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
  year?: string | number;
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
  notes?: string;
  secondaryContent?: string;
  backgroundConfig?: string;
};

type ImportedPlan = {
  date?: string | Date;
  title?: string;
  backgroundConfig?: string;
  items?: ImportedPlanItem[];
};

type ImportedDataPayload = {
  songs?: unknown;
  plans?: unknown;
};

type MigratedDataPayload = {
  songs: unknown;
  plans: unknown;
  schemaVersion: number;
  warnings: string[];
};

const DATA_EXPORT_KIND = "CHURCH_PRESENTER_EXPORT" as const;
const DATA_EXPORT_SCHEMA_VERSION = 2 as const;

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
  year?: string;
  language?: string;
  tags?: string;
  blocks: NormalizedSongBlock[];
};
export type DataNormalizedSong = NormalizedSong;

type NormalizedPlanItem = {
  order: number;
  kind: CpPlanItemKind;
  refId?: string;
  refSubId?: string;
  title?: string;
  content?: string;
  mediaPath?: string;
  notes?: string;
  secondaryContent?: string;
  backgroundConfig?: string;
};

type NormalizedPlan = {
  date?: string | Date;
  title: string;
  backgroundConfig?: string;
  items: NormalizedPlanItem[];
};
export type DataNormalizedPlan = NormalizedPlan;

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

function asRawString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
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
      year: asStringLike(s.year),
      language: asStringLike(s.language),
      tags: asStringLike(s.tags),
      blocks,
    });
  }
  return songs;
}

const BACKUP_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

async function pruneOldBackups(backupsDir: string) {
  let entries: string[];
  try {
    entries = await readdir(backupsDir);
  } catch {
    return; // dossier inexistant, rien à faire
  }
  const now = Date.now();
  for (const name of entries) {
    if (!name.endsWith(".bak")) continue;
    const filePath = join(backupsDir, name);
    try {
      const info = await stat(filePath);
      if (now - info.mtimeMs > BACKUP_MAX_AGE_MS) {
        await unlink(filePath);
      }
    } catch {
      // fichier déjà supprimé ou inaccessible — on ignore
    }
  }
}

async function backupDatabaseSnapshot(reason: string) {
  const databasePath = databasePathFromUrl(process.env["DATABASE_URL"]);
  if (!databasePath) return null;
  try {
    await stat(databasePath);
  } catch {
    return null;
  }
  const backupsDir = join(app.getPath("userData"), "backups");
  await mkdir(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = join(backupsDir, `${basename(databasePath)}.${reason}.${stamp}.bak`);
  await copyFile(databasePath, outputPath);
  // Nettoyage best-effort des backups de plus de 30 jours
  void pruneOldBackups(backupsDir);
  return outputPath;
}

export async function createSongWithBlocks(tx: Prisma.TransactionClient, songData: DataNormalizedSong) {
  const song = await tx.song.create({
    data: {
      title: songData.title || "Sans titre",
      artist: songData.artist,
      album: songData.album,
      year: songData.year,
      language: songData.language,
      tags: songData.tags,
    },
  });
  for (const b of songData.blocks) {
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
  return song;
}

export async function createPlanWithItems(tx: Prisma.TransactionClient, planData: DataNormalizedPlan) {
  const plan = await tx.servicePlan.create({
    data: {
      date: normalizeDateToMidnight(planData.date),
      title: planData.title,
      backgroundConfig: planData.backgroundConfig,
    },
  });
  for (const it of planData.items) {
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
        notes: it.notes,
        secondaryContent: it.secondaryContent,
        backgroundConfig: it.backgroundConfig,
      },
    });
  }
  return plan;
}

type DataImportPrisma = Pick<ReturnType<typeof getPrisma>, "$transaction">;
export type DataMergeImportOutcome =
  | { ok: true; imported: true; partial: boolean; counts: { songs: number; plans: number }; errors: CpDataImportError[] }
  | { ok: false; rolledBack: true; error: string };

export async function importNormalizedDataMerge(
  prisma: DataImportPrisma,
  songs: DataNormalizedSong[],
  plans: DataNormalizedPlan[],
  atomicity: "ENTITY" | "STRICT",
  validationErrors: CpDataImportError[]
): Promise<DataMergeImportOutcome> {
  if (atomicity === "STRICT") {
    try {
      const counts = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        let strictSongsImported = 0;
        let strictPlansImported = 0;
        for (const s of songs) {
          await createSongWithBlocks(tx, s);
          strictSongsImported += 1;
        }
        for (const p of plans) {
          await createPlanWithItems(tx, p);
          strictPlansImported += 1;
        }
        return { songs: strictSongsImported, plans: strictPlansImported };
      });
      return {
        ok: true,
        imported: true,
        partial: validationErrors.length > 0,
        counts,
        errors: validationErrors,
      };
    } catch (e: unknown) {
      return { ok: false, rolledBack: true, error: getErrorMessage(e) };
    }
  }

  const errors: CpDataImportError[] = [...validationErrors];
  let songsImported = 0;
  let plansImported = 0;

  for (const s of songs) {
    try {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await createSongWithBlocks(tx, s);
      });
      songsImported += 1;
    } catch (e: unknown) {
      errors.push({ kind: "song", title: s.title, message: getErrorMessage(e) });
    }
  }

  for (const p of plans) {
    try {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await createPlanWithItems(tx, p);
      });
      plansImported += 1;
    } catch (e: unknown) {
      errors.push({ kind: "plan", title: p.title, message: getErrorMessage(e) });
    }
  }

  return { ok: true, imported: true, partial: errors.length > 0, counts: { songs: songsImported, plans: plansImported }, errors };
}

export function normalizePlans(rawPlans: unknown, errors: CpDataImportError[]): NormalizedPlan[] {
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
          const rawKind = asStringLike(it.kind);
          const kind = normalizeCpPlanItemKind(rawKind);
          if (!isCpPlanItemKind(rawKind)) {
            pushValidationError(
              errors,
              `plans[${planIdx}].items[${itemIdx}].kind invalide, fallback "${kind}" applique`,
              title
            );
          }
          items.push({
            order: asPositiveInt(it.order, itemIdx + 1),
            kind,
            refId: asStringLike(it.refId),
            refSubId: asStringLike(it.refSubId),
            title: asStringLike(it.title),
            content: asStringLike(it.content),
            mediaPath: asStringLike(it.mediaPath),
            notes: asRawString(it.notes),
            secondaryContent: asRawString(it.secondaryContent),
            backgroundConfig: asRawString(it.backgroundConfig),
          });
        }
      }
    }

    plans.push({
      date: p.date,
      title,
      backgroundConfig: asRawString(p.backgroundConfig),
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

export function migrateImportedDataPayload(raw: unknown): MigratedDataPayload {
  if (!isRecord(raw)) {
    throw new Error("Invalid JSON structure (object expected)");
  }

  const kind = asStringLike(raw.kind);
  const schemaVersionRaw = raw.schemaVersion;
  const schemaVersion =
    typeof schemaVersionRaw === "number" && Number.isFinite(schemaVersionRaw)
      ? Math.trunc(schemaVersionRaw)
      : undefined;

  if (schemaVersion != null || kind != null || "payload" in raw) {
    if (kind != null && kind !== DATA_EXPORT_KIND) {
      throw new Error(`Unsupported export kind: ${kind}`);
    }
    const detectedVersion = schemaVersion ?? 1;
    if (detectedVersion > DATA_EXPORT_SCHEMA_VERSION) {
      throw new Error(`Unsupported export schema version: ${detectedVersion}`);
    }

    if (detectedVersion >= 2) {
      if (!isRecord(raw.payload)) {
        throw new Error("Invalid JSON structure (payload object expected)");
      }
      return {
        songs: raw.payload.songs,
        plans: raw.payload.plans,
        schemaVersion: detectedVersion,
        warnings: [],
      };
    }

    const payload = isRecord(raw.payload) ? raw.payload : raw;
    return {
      songs: payload.songs,
      plans: payload.plans,
      schemaVersion: detectedVersion,
      warnings: [
        "Legacy schema detected (v1). Migration applied automatically.",
      ],
    };
  }

  // Legacy payload without kind/schemaVersion metadata.
  return {
    songs: raw.songs,
    plans: raw.plans,
    schemaVersion: 1,
    warnings: [
      "Legacy JSON detected (missing schema metadata). Migration applied automatically.",
    ],
  };
}

export function registerDataIpc() {
  ipcMain.handle("data:exportAll", async () => {
    const prisma = getPrisma();
    const plansRaw = await prisma.servicePlan.findMany({
      where: { deletedAt: null },
      include: { items: { orderBy: { order: "asc" } } },
    });
    const payload: CpDataFileV2 = {
      kind: DATA_EXPORT_KIND,
      schemaVersion: DATA_EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      payload: {
        songs: await prisma.song.findMany({ where: { deletedAt: null }, include: { blocks: { orderBy: { order: "asc" } } } }),
        plans: plansRaw.map((plan) => ({
          ...plan,
          items: plan.items.map((item) => ({
            ...item,
            kind: normalizeCpPlanItemKind(item.kind),
          })),
        })),
      },
    };

    const res = await dialog.showSaveDialog({
      title: "Exporter la base",
      defaultPath: "church-presenter.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (res.canceled || !res.filePath) return { ok: false, canceled: true };
    await mkdir(dirname(res.filePath), { recursive: true });
    await writeFile(res.filePath, JSON.stringify(payload, null, 2), "utf-8");
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
    const raw = await readFile(path, "utf-8");
    let data: ImportedDataPayload;
    const migrationWarnings: string[] = [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      const migrated = migrateImportedDataPayload(parsed);
      data = { songs: migrated.songs, plans: migrated.plans };
      migrationWarnings.push(...migrated.warnings);
    } catch (e: unknown) {
      return { ok: false, error: getErrorMessage(e) || "Invalid JSON file" };
    }

    const mode = payload.mode || "MERGE";
    const atomicity = payload.atomicity;
    const validationErrors: CpDataImportError[] = [];
    migrationWarnings.forEach((warning) => pushValidationError(validationErrors, warning));
    const songs = normalizeSongs(data.songs, validationErrors);
    const plans = normalizePlans(data.plans, validationErrors);

    if (mode === "REPLACE") {
      try {
        await backupDatabaseSnapshot("before-replace-import");
        const counts = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          await tx.songBlock.deleteMany({});
          await tx.song.deleteMany({});
          await tx.serviceItem.deleteMany({});
          await tx.servicePlan.deleteMany({});

          let songsImported = 0;
          let plansImported = 0;

          for (const s of songs) {
            await createSongWithBlocks(tx, s);
            songsImported += 1;
          }

          for (const p of plans) {
            await createPlanWithItems(tx, p);
            plansImported += 1;
          }

          return { songs: songsImported, plans: plansImported };
        });

        return { ok: true, imported: true, partial: validationErrors.length > 0, counts, errors: validationErrors };
      } catch (e: unknown) {
        return { ok: false, rolledBack: true, error: getErrorMessage(e) };
      }
    }

    return importNormalizedDataMerge(prisma, songs, plans, atomicity, validationErrors);
  });
}
