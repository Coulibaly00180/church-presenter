import { ipcMain } from "electron";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "../db";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import {
  parseNonEmptyString,
  parseOptionalQuery,
  parseSongCreatePayload,
  parseSongReplaceBlocksPayload,
  parseSongUpdateMetaPayload,
} from "./runtimeValidation";

export function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeMultiline(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeYear(value?: string): string | undefined {
  if (!value) return undefined;
  const clean = normalizeWhitespace(value);
  const explicit = clean.match(/\b(19\d{2}|20\d{2}|21\d{2})\b/);
  if (explicit?.[1]) return explicit[1];

  const digits = clean.replace(/\D/g, "");
  if (/^\d{4}$/.test(digits)) return digits;
  return undefined;
}

export function sanitizeFilename(value: string): string {
  const normalized = normalizeWhitespace(value)
    .replace(/[<>:"/\\|?*]/g, " ")
    .split("")
    .map((char) => (char.charCodeAt(0) < 32 ? " " : char))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  const compact = normalized.replace(/[. ]+$/g, "");
  return compact.length > 0 ? compact : "chant";
}

type PrismaClientType = ReturnType<typeof getPrisma>;
type SongImportPrisma = Pick<PrismaClientType, "$transaction">;

type NormalizedImportSongBlock = { order: number; type: string; title?: string; content: string };

export type SongImportEntity = {
  title: string;
  artist?: string;
  album?: string;
  year?: string;
  language?: string;
  tags?: string;
  blocks: NormalizedImportSongBlock[];
};

export async function createSongWithBlocksAtomic(prisma: SongImportPrisma, songEntry: SongImportEntity) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const song = await tx.song.create({
      data: {
        title: songEntry.title,
        artist: songEntry.artist,
        album: songEntry.album,
        year: songEntry.year,
        language: songEntry.language,
        tags: songEntry.tags,
      },
    });
    for (const b of songEntry.blocks) {
      await tx.songBlock.create({
        data: {
          songId: song.id,
          order: b.order,
          type: b.type || "VERSE",
          title: b.title,
          content: b.content.trim(),
        },
      });
    }
    return song;
  });
}

const SONG_JSON_KIND = "CHURCH_PRESENTER_SONGS_EXPORT" as const;
const SONG_JSON_SCHEMA_VERSION = 2 as const;

type SongForJsonSync = {
  id: string;
  title: string;
  artist?: string | null;
  album?: string | null;
  year?: string | null;
  blocks: Array<{ order: number; type: string; title?: string | null; content: string }>;
};

async function writeSongJsonAutoSync(
  song: SongForJsonSync,
  dirFn: (() => Promise<string | null>) | undefined,
): Promise<void> {
  if (!dirFn) return;
  try {
    const dir = await dirFn();
    if (!dir) return;
    await mkdir(dir, { recursive: true });
    const data = {
      kind: SONG_JSON_KIND,
      schemaVersion: SONG_JSON_SCHEMA_VERSION,
      payload: {
        songs: [
          {
            title: song.title,
            artist: song.artist ?? undefined,
            album: song.album ?? undefined,
            year: song.year ?? undefined,
            blocks: song.blocks.map((b) => ({
              order: b.order,
              type: b.type,
              title: b.title ?? undefined,
              content: b.content,
            })),
          },
        ],
      },
    };
    await writeFile(path.join(dir, `${song.id}.json`), JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Auto-sync is best-effort; ignore errors silently.
  }
}

async function deleteSongJsonAutoSync(
  songId: string,
  dirFn: (() => Promise<string | null>) | undefined,
): Promise<void> {
  if (!dirFn) return;
  try {
    const dir = await dirFn();
    if (!dir) return;
    await unlink(path.join(dir, `${songId}.json`));
  } catch {
    // File may not exist; ignore.
  }
}

export type RegisterSongsIpcOptions = {
  getSongsJsonDir?: () => Promise<string | null>;
};

export function registerSongsIpcMeta(options?: RegisterSongsIpcOptions) {
  ipcMain.handle("songs:list", async (_evt, rawQ?: unknown, rawSortBy?: unknown) => {
    const prisma = getPrisma();
    const query = (parseOptionalQuery(rawQ, "songs:list.query") ?? "").trim();
    const sortBy = typeof rawSortBy === "string" && ["title", "artist", "updatedAt", "createdAt"].includes(rawSortBy)
      ? (rawSortBy as "title" | "artist" | "updatedAt" | "createdAt")
      : "title";

    const browseOrderBy: Prisma.SongOrderByWithRelationInput | Prisma.SongOrderByWithRelationInput[] =
      sortBy === "artist" ? [{ artist: "asc" as const }, { title: "asc" as const }]
      : sortBy === "updatedAt" ? { updatedAt: "desc" as const }
      : sortBy === "createdAt" ? { createdAt: "desc" as const }
      : { title: "asc" as const };

    if (query.length > 0) {
      const songs = await prisma.song.findMany({
        where: {
          deletedAt: null,
          OR: [
            { title: { contains: query } },
            { artist: { contains: query } },
            { album: { contains: query } },
            { tags: { contains: query } },
            { blocks: { some: { content: { contains: query } } } },
          ],
        },
        orderBy: browseOrderBy,
        select: {
          id: true, title: true, artist: true, album: true, year: true, updatedAt: true,
          blocks: { where: { content: { contains: query } }, select: { content: true }, take: 1 },
        },
        take: 200,
      });

      return songs.map((s) => {
        const { blocks, ...rest } = s;
        let matchSnippet: string | null = null;
        if (blocks && blocks.length > 0) {
          const content = blocks[0].content;
          const idx = content.toLowerCase().indexOf(query.toLowerCase());
          if (idx >= 0) {
            const start = Math.max(0, idx - 30);
            const end = Math.min(content.length, idx + query.length + 50);
            matchSnippet =
              (start > 0 ? "..." : "") +
              content.slice(start, end).trim() +
              (end < content.length ? "..." : "");
          }
        }
        return { ...rest, matchSnippet };
      });
    }

    return prisma.song.findMany({
      where: { deletedAt: null },
      orderBy: browseOrderBy,
      select: { id: true, title: true, artist: true, album: true, year: true, updatedAt: true },
      take: 200,
    });
  });

  ipcMain.handle("songs:get", async (_evt, rawId: unknown) => {
    const prisma = getPrisma();
    const id = parseNonEmptyString(rawId, "songs:get.id");
    return prisma.song.findUnique({
      where: { id },
      include: { blocks: { orderBy: { order: "asc" } } },
    });
  });

  ipcMain.handle("songs:create", async (_evt, rawPayload: unknown) => {
    const prisma = getPrisma();
    const payload = parseSongCreatePayload(rawPayload);
    const song = await prisma.song.create({
      data: {
        title: payload.title,
        artist: payload.artist,
        album: payload.album,
        year: payload.year,
        blocks: {
          create: [
            { order: 1, type: "VERSE", title: "Couplet 1", content: "" },
            { order: 2, type: "CHORUS", title: "Refrain", content: "" },
          ],
        },
      },
      include: { blocks: { orderBy: { order: "asc" } } },
    });
    void writeSongJsonAutoSync(song, options?.getSongsJsonDir);
    return song;
  });

  ipcMain.handle("songs:updateMeta", async (_evt, rawPayload: unknown) => {
    const prisma = getPrisma();
    const payload = parseSongUpdateMetaPayload(rawPayload);
    const song = await prisma.song.update({
      where: { id: payload.id },
      data: { title: payload.title, artist: payload.artist, album: payload.album, year: payload.year },
      include: { blocks: { orderBy: { order: "asc" } } },
    });
    void writeSongJsonAutoSync(song, options?.getSongsJsonDir);
    return song;
  });

  ipcMain.handle("songs:replaceBlocks", async (_evt, rawPayload: unknown) => {
    const prisma = getPrisma();
    const payload = parseSongReplaceBlocksPayload(rawPayload);
    const song = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.songBlock.deleteMany({ where: { songId: payload.songId } });
      await tx.songBlock.createMany({
        data: payload.blocks.map((b) => ({
          songId: payload.songId,
          order: b.order,
          type: b.type,
          title: b.title,
          content: b.content,
        })),
      });

      return tx.song.findUnique({
        where: { id: payload.songId },
        include: { blocks: { orderBy: { order: "asc" } } },
      });
    });
    if (song) void writeSongJsonAutoSync(song, options?.getSongsJsonDir);
    return song;
  });

  ipcMain.handle("songs:delete", async (_evt, rawId: unknown) => {
    const prisma = getPrisma();
    const id = parseNonEmptyString(rawId, "songs:delete.id");
    await prisma.song.update({ where: { id }, data: { deletedAt: new Date() } });
    void deleteSongJsonAutoSync(id, options?.getSongsJsonDir);
    return { ok: true };
  });

  ipcMain.handle("songs:getFrequent", async (_evt, rawLimit?: unknown) => {
    const prisma = getPrisma();
    const limit = typeof rawLimit === "number" && rawLimit > 0 ? Math.min(rawLimit, 50) : 10;

    const grouped = await prisma.serviceItem.groupBy({
      by: ["songId"],
      where: { kind: "SONG_BLOCK", songId: { not: null } },
      _count: { songId: true },
      orderBy: { _count: { songId: "desc" } },
      take: limit * 3,
    });

    const songIds = grouped
      .map((g) => g.songId)
      .filter((id): id is string => !!id);

    if (songIds.length === 0) return [];

    const songs = await prisma.song.findMany({
      where: { id: { in: songIds }, deletedAt: null },
      select: { id: true, title: true, artist: true, album: true, year: true, updatedAt: true },
      take: limit,
    });

    const order = new Map(songIds.map((id, i) => [id, i]));
    return songs
      .sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999))
      .map((s) => ({ ...s, matchSnippet: null }));
  });
}
