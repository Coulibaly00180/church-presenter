import { dialog, ipcMain } from "electron";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "../db";
import { Document, Packer, Paragraph, TextRun } from "docx";
import mammoth from "mammoth";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import type { CpSongBlockType } from "../../shared/ipc";

const SUPPORTED_DOC_EXTENSIONS = [".docx", ".odt"];
type PrismaClientType = ReturnType<typeof getPrisma>;
type ImportSongBlock = { order?: number; type?: string; title?: string; content?: string };
type ImportSongMeta = {
  paroles?: string;
  titre?: string;
  auteur_interprete?: string;
  auteur?: string;
  interprete?: string;
  album_inclus_dans?: string;
  langue?: string;
  annee_de_sortie_single?: string | number;
};
type ImportSongEntry = {
  title?: string;
  titre?: string;
  artist?: string;
  auteur?: string;
  album?: string;
  year?: string | number;
  annee?: string | number;
  published?: string | number;
  release_year?: string | number;
  language?: string;
  lang?: string;
  tags?: string;
  lyrics?: string;
  paroles?: string;
  blocks?: ImportSongBlock[];
  meta?: ImportSongMeta;
  songs?: ImportSongEntry[];
};
type NormalizedImportSongBlock = { order: number; type: string; title?: string; content: string };
type NormalizedImportSong = {
  title: string;
  artist?: string;
  album?: string;
  language?: string;
  tags?: string;
  blocks: NormalizedImportSongBlock[];
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

function asMeta(value: unknown): ImportSongMeta {
  if (!isRecord(value)) return {};
  return value as ImportSongMeta;
}

function normalizeBlock(rawBlock: unknown, idx: number): NormalizedImportSongBlock | null {
  if (!isRecord(rawBlock)) return null;
  const content = asStringLike(rawBlock.content) || "";
  const parsedOrder = typeof rawBlock.order === "number" && Number.isFinite(rawBlock.order) ? Math.floor(rawBlock.order) : idx + 1;
  return {
    order: parsedOrder > 0 ? parsedOrder : idx + 1,
    type: asString(rawBlock.type) || "VERSE",
    title: asString(rawBlock.title),
    content: content.trim(),
  };
}

function splitBlocks(text: string) {
  return text
    .split(/\n\s*\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseSongText(raw: string, filename?: string) {
  const rawLines = raw.split(/\r?\n/);
  const lines = rawLines.map((l) => l.trim()).filter(Boolean);
  const title =
    lines.find((l) => /^titre\s*:/i.test(l))?.split(":").slice(1).join(":").trim() ||
    filename?.replace(/\.(docx|odt)$/i, "") ||
    "Sans titre";
  const artist = lines.find((l) => /^auteur\s*:/i.test(l))?.split(":").slice(1).join(":").trim();
  const album = lines.find((l) => /^album\s*:/i.test(l))?.split(":").slice(1).join(":").trim();
  const year =
    lines.find((l) => /^ann[eé]e/i.test(l))?.split(":").slice(1).join(":").trim() ||
    lines.find((l) => /^année de parution/i.test(l))?.split(":").slice(1).join(":").trim();

  // Keep empty lines to preserve stanza boundaries.
  let lyrics = "";
  const parolesIdx = rawLines.findIndex((l) => /^paroles\s*:?/i.test(l.trim()));
  if (parolesIdx >= 0) {
    lyrics = rawLines.slice(parolesIdx + 1).join("\n").trim();
  } else {
    const metaKeys = ["titre", "auteur", "album", "ann", "année", "annee"];
    lyrics = rawLines
      .filter((l) => {
        const trimmed = l.trim().toLowerCase();
        if (!trimmed) return true;
        return !metaKeys.some((k) => trimmed.startsWith(k));
      })
      .join("\n")
      .trim();
  }

  const paragraphs = splitBlocks(lyrics);
  const blocks =
    paragraphs.length > 0
      ? paragraphs.map((content, idx) => ({
          order: idx + 1,
          type: idx === 0 ? "VERSE" : "CHORUS",
          title: idx === 0 ? "Couplet" : "Refrain",
          content,
        }))
      : [
          {
            order: 1,
            type: "VERSE",
            title: "Couplet",
            content: lyrics.trim(),
          },
        ];

  return { title, artist, album, year, blocks };
}

async function extractTextFromDoc(buffer: Buffer, ext: string) {
  if (ext === ".docx") {
    const { value } = await mammoth.extractRawText({ buffer });
    return value || "";
  }
  if (ext === ".odt") {
    const zip = new AdmZip(buffer);
    const entry = zip.getEntry("content.xml");
    if (!entry) throw new Error("content.xml manquant");
    const xml = entry.getData().toString("utf-8");
    return xml
      .replace(/<\/text:p>/g, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  throw new Error("Extension non supportee");
}

async function importDocSong(prisma: PrismaClientType, filePath: string) {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_DOC_EXTENSIONS.includes(ext)) throw new Error("Extension non supportee (docx / odt)");

  const raw = await extractTextFromDoc(buffer, ext);
  const parsed = parseSongText(raw, path.basename(filePath));

  const song = await prisma.song.create({
    data: {
      title: parsed.title,
      artist: parsed.artist,
      album: parsed.album,
      tags: parsed.year,
    },
  });
  await prisma.songBlock.createMany({
    data: parsed.blocks.map((b) => ({ ...b, songId: song.id })),
  });
  return song;
}

async function importJsonFile(prisma: PrismaClientType, filePath: string) {
  const raw = fs.readFileSync(filePath, "utf-8");
  let payload: unknown = JSON.parse(raw);

  if (isRecord(payload) && "songs" in payload) {
    payload = (payload as ImportSongEntry).songs ?? [];
  }

  if (isRecord(payload)) {
    payload = [payload]; // accepte un seul chant
  }

  if (!Array.isArray(payload)) {
    throw new Error("Le fichier doit contenir un tableau de chants ou un objet unique.");
  }

  const normalizedSongs: NormalizedImportSong[] = [];
  const errors: Array<{ path: string; title?: string; message: string }> = [];

  for (const [songIdx, rawSong] of payload.entries()) {
    if (!isRecord(rawSong)) {
      errors.push({ path: filePath, message: `Entree #${songIdx + 1}: format invalide (objet attendu)` });
      continue;
    }

    const s = rawSong as ImportSongEntry;
    const meta = asMeta(s.meta);
    let blocks: NormalizedImportSongBlock[] = [];

    if (Array.isArray(s.blocks)) {
      blocks = s.blocks
        .map((b, idx) => normalizeBlock(b, idx))
        .filter((b): b is NormalizedImportSongBlock => !!b);
      if (blocks.length !== s.blocks.length) {
        errors.push({
          path: filePath,
          title: asStringLike(s.title) || asStringLike(s.titre),
          message: `Entree #${songIdx + 1}: certains blocs sont ignores (format invalide)`,
        });
      }
    } else if (s.blocks != null) {
      errors.push({
        path: filePath,
        title: asStringLike(s.title) || asStringLike(s.titre),
        message: `Entree #${songIdx + 1}: blocks doit etre un tableau`,
      });
    }

    const lyrics = asStringLike(s.lyrics) || asStringLike(s.paroles) || asStringLike(meta.paroles);
    if (blocks.length === 0 && lyrics) {
      blocks = splitBlocks(lyrics).map((content, idx) => ({
        order: idx + 1,
        type: idx === 0 ? "VERSE" : "CHORUS",
        title: idx === 0 ? "Couplet" : "Refrain",
        content,
      }));
    }

    const year =
      asStringLike(s.year) ||
      asStringLike(s.annee) ||
      asStringLike(s.published) ||
      asStringLike(s.release_year) ||
      asStringLike(meta.annee_de_sortie_single);
    const tags = asStringLike(s.tags) || (year != null ? String(year).slice(0, 10) : undefined);
    const title = asStringLike(s.title) || asStringLike(s.titre) || asStringLike(meta.titre) || "Sans titre";
    const artist =
      asStringLike(s.artist) ||
      asStringLike(s.auteur) ||
      asStringLike(meta.auteur_interprete) ||
      asStringLike(meta.auteur) ||
      asStringLike(meta.interprete);
    const album = asStringLike(s.album) || asStringLike(meta.album_inclus_dans);
    const language = asStringLike(s.language) || asStringLike(s.lang) || asStringLike(meta.langue);

    normalizedSongs.push({
      title,
      artist,
      album,
      language,
      tags,
      blocks,
    });
  }

  let imported = 0;
  for (const songEntry of normalizedSongs) {
    try {
      const song = await prisma.song.create({
        data: {
          title: songEntry.title,
          artist: songEntry.artist,
          album: songEntry.album,
          language: songEntry.language,
          tags: songEntry.tags,
        },
      });
      for (const b of songEntry.blocks) {
        await prisma.songBlock.create({
          data: {
            songId: song.id,
            order: b.order,
            type: b.type || "VERSE",
            title: b.title,
            content: b.content.trim(),
          },
        });
      }
      imported += 1;
    } catch (e: unknown) {
      errors.push({ path: filePath, title: songEntry.title, message: getErrorMessage(e) });
    }
  }

  return { imported, errors };
}

type BlockInput = {
  order: number;
  type: CpSongBlockType;
  title?: string;
  content: string;
};

export function registerSongsIpc() {
  ipcMain.handle("songs:list", async (_evt, q?: string) => {
    const prisma = getPrisma();
    const query = (q ?? "").trim();

    if (query.length > 0) {
      return prisma.song.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { artist: { contains: query } },
            { album: { contains: query } },
            { tags: { contains: query } },
            { blocks: { some: { content: { contains: query } } } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, artist: true, album: true, updatedAt: true },
        take: 200,
      });
    }

    return prisma.song.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, artist: true, album: true, updatedAt: true },
      take: 200,
    });
  });

  ipcMain.handle("songs:get", async (_evt, id: string) => {
    const prisma = getPrisma();
    return prisma.song.findUnique({
      where: { id },
      include: { blocks: { orderBy: { order: "asc" } } },
    });
  });

  ipcMain.handle("songs:create", async (_evt, payload: { title: string; artist?: string; album?: string }) => {
    const prisma = getPrisma();
    return prisma.song.create({
      data: {
        title: payload.title,
        artist: payload.artist,
        album: payload.album,
        blocks: {
          create: [
            { order: 1, type: "VERSE", title: "Couplet 1", content: "" },
            { order: 2, type: "CHORUS", title: "Refrain", content: "" },
          ],
        },
      },
      include: { blocks: { orderBy: { order: "asc" } } },
    });
  });

  ipcMain.handle("songs:updateMeta", async (_evt, payload: { id: string; title: string; artist?: string; album?: string }) => {
    const prisma = getPrisma();
    return prisma.song.update({
      where: { id: payload.id },
      data: { title: payload.title, artist: payload.artist, album: payload.album },
      include: { blocks: { orderBy: { order: "asc" } } },
    });
  });

  ipcMain.handle("songs:replaceBlocks", async (_evt, payload: { songId: string; blocks: BlockInput[] }) => {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
  });

  ipcMain.handle("songs:delete", async (_evt, id: string) => {
    const prisma = getPrisma();
    await prisma.song.delete({ where: { id } });
    return { ok: true };
  });

  ipcMain.handle("songs:exportWord", async (_evt, songId: string) => {
    const prisma = getPrisma();
    const song = await prisma.song.findUnique({ where: { id: songId }, include: { blocks: { orderBy: { order: "asc" } } } });
    if (!song) throw new Error("Song not found");

    const lyrics = (song.blocks || [])
      .map((b: { content?: string | null }) => (b.content || "").trim())
      .filter(Boolean)
      .join("\n\n");
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({ children: [new TextRun({ text: `Titre : ${song.title}`, bold: true })] }),
            new Paragraph(`Auteur : ${song.artist || ""}`),
            new Paragraph(`Annee de parution : ${""}`),
            new Paragraph(`Album : ${song.album || ""}`),
            new Paragraph(""),
            new Paragraph({ children: [new TextRun({ text: "Paroles :", bold: true })] }),
            ...lyrics.split("\n").map((line: string) => new Paragraph(line)),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    const res = await dialog.showSaveDialog({
      title: "Exporter le chant",
      defaultPath: `${song.title}.docx`,
      filters: [{ name: "Word", extensions: ["docx"] }],
    });
    if (res.canceled || !res.filePath) return { ok: false, canceled: true };
    fs.writeFileSync(res.filePath, buffer);
    return { ok: true, path: res.filePath };
  });

  ipcMain.handle("songs:importWord", async () => {
    const res = await dialog.showOpenDialog({
      title: "Importer un chant (Word)",
      filters: [{ name: "Word", extensions: ["docx"] }],
      properties: ["openFile"],
    });
    if (res.canceled || !res.filePaths?.[0]) return { ok: false, canceled: true };

    const filePath = res.filePaths[0];
    const { value } = await mammoth.extractRawText({ path: filePath });
    const parsed = parseSongText(value || "", path.basename(filePath));

    const prisma = getPrisma();
    const created = await prisma.song.create({
      data: {
        title: parsed.title,
        artist: parsed.artist,
        album: parsed.album,
        tags: parsed.year,
        blocks: {
          create: parsed.blocks,
        },
      },
      include: { blocks: { orderBy: { order: "asc" } } },
    });

    return { ok: true, song: created };
  });

  ipcMain.handle("songs:importJson", async () => {
    const prisma = getPrisma();
    const res = await dialog.showOpenDialog({
      title: "Importer des chants (JSON)",
      filters: [{ name: "JSON", extensions: ["json"] }],
      properties: ["openFile"],
    });
    if (res.canceled || !res.filePaths?.[0]) return { ok: false, canceled: true };

    try {
      const r = await importJsonFile(prisma, res.filePaths[0]);
      return { ok: true, imported: r.imported, errors: r.errors, path: res.filePaths[0] };
    } catch (e: unknown) {
      return { ok: false, error: getErrorMessage(e) };
    }
  });

  ipcMain.handle("songs:importWordBatch", async () => {
    const res = await dialog.showOpenDialog({
      title: "Importer des chants (Word/ODT)",
      filters: [{ name: "Documents", extensions: ["docx", "odt"] }],
      properties: ["openFile", "multiSelections"],
    });
    if (res.canceled || !res.filePaths?.length) return { ok: false, canceled: true };

    const prisma = getPrisma();
    let imported = 0;
    const errors: Array<{ path: string; message: string }> = [];
    for (const p of res.filePaths) {
      try {
        await importDocSong(prisma, p);
        imported += 1;
      } catch (e: unknown) {
        errors.push({ path: p, message: getErrorMessage(e) });
      }
    }
    return { ok: true, imported, errors, files: res.filePaths };
  });

  ipcMain.handle("songs:importAuto", async () => {
    const res = await dialog.showOpenDialog({
      title: "Importer des chants (docx / odt / json)",
      filters: [
        { name: "Chants", extensions: ["docx", "odt", "json"] },
        { name: "Tous", extensions: ["*"] },
      ],
      properties: ["openFile", "multiSelections"],
    });
    if (res.canceled || !res.filePaths?.length) return { ok: false, canceled: true };

    const prisma = getPrisma();
    let imported = 0;
    let jsonFiles = 0;
    let docFiles = 0;
    const errors: Array<{ path: string; message: string }> = [];

    for (const p of res.filePaths) {
      const ext = path.extname(p).toLowerCase();
      try {
        if (ext === ".json") {
          const r = await importJsonFile(prisma, p);
          imported += r.imported;
          jsonFiles += 1;
          if (r.errors.length) errors.push(...r.errors.map((e) => ({ path: e.path, message: e.message })));
        } else if (SUPPORTED_DOC_EXTENSIONS.includes(ext)) {
          await importDocSong(prisma, p);
          imported += 1;
          docFiles += 1;
      } else {
        errors.push({ path: p, message: "Extension non supportee" });
      }
      } catch (e: unknown) {
        errors.push({ path: p, message: getErrorMessage(e) });
      }
    }

    return { ok: true, imported, docFiles, jsonFiles, errors, files: res.filePaths };
  });
}
