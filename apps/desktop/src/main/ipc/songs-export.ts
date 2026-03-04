import { dialog, ipcMain } from "electron";
import { getPrisma } from "../db";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { writeFile } from "fs/promises";
import AdmZip from "adm-zip";
import { parseNonEmptyString, parseSongExportWordPackPayload } from "./runtimeValidation";
import { normalizeMultiline, normalizeWhitespace, normalizeYear, sanitizeFilename } from "./songs-meta";

type WordSongSource = {
  title: string;
  artist?: string | null;
  album?: string | null;
  year?: string | null;
  tags?: string | null;
  blocks: Array<{ content?: string | null }>;
};

function buildWordLyrics(song: WordSongSource): string {
  return (song.blocks || [])
    .map((block) => normalizeMultiline(block.content || ""))
    .filter(Boolean)
    .join("\n\n");
}

function buildSongWordDocument(song: WordSongSource) {
  const title = normalizeWhitespace(song.title || "Sans titre");
  const artist = normalizeWhitespace(song.artist || "");
  const album = normalizeWhitespace(song.album || "");
  const year = normalizeYear(song.year || undefined) || normalizeYear(song.tags || undefined) || "";
  const lyrics = buildWordLyrics(song);

  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: `Titre : ${title}`, bold: true })],
    }),
    new Paragraph(`Auteur : ${artist}`),
    new Paragraph(`Annee de parution : ${year}`),
    new Paragraph(`Album : ${album}`),
    new Paragraph(""),
    new Paragraph({
      children: [new TextRun({ text: "Paroles :", bold: true })],
    }),
    ...lyrics.split("\n").map((line) => new Paragraph(line)),
  ];

  return new Document({
    sections: [{ properties: {}, children }],
  });
}

async function buildSongWordBuffer(song: WordSongSource) {
  const document = buildSongWordDocument(song);
  return Packer.toBuffer(document);
}

function uniqueDocxName(baseTitle: string, used: Set<string>) {
  const base = sanitizeFilename(baseTitle);
  let candidate = `${base}.docx`;
  let index = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${base} (${index}).docx`;
    index += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export function registerSongsIpcExport() {
  ipcMain.handle("songs:exportWord", async (_evt, rawSongId: unknown) => {
    const prisma = getPrisma();
    const songId = parseNonEmptyString(rawSongId, "songs:exportWord.songId");
    const song = await prisma.song.findUnique({
      where: { id: songId },
      include: { blocks: { orderBy: { order: "asc" } } },
    });
    if (!song) throw new Error("Song not found");

    const buffer = await buildSongWordBuffer(song);
    const res = await dialog.showSaveDialog({
      title: "Exporter le chant",
      defaultPath: `${sanitizeFilename(song.title)}.docx`,
      filters: [{ name: "Word", extensions: ["docx"] }],
    });
    if (res.canceled || !res.filePath) return { ok: false, canceled: true };
    await writeFile(res.filePath, buffer);
    return { ok: true, path: res.filePath, format: "SINGLE_DOCX" };
  });

  ipcMain.handle("songs:exportWordPack", async (_evt, rawPayload: unknown) => {
    const prisma = getPrisma();
    const payload = parseSongExportWordPackPayload(rawPayload);
    const where = payload.songIds?.length
      ? { deletedAt: null, id: { in: payload.songIds } }
      : { deletedAt: null };

    const songs = await prisma.song.findMany({
      where,
      include: { blocks: { orderBy: { order: "asc" } } },
      orderBy: { title: "asc" },
    });
    if (songs.length === 0) throw new Error("No songs to export");

    const zip = new AdmZip();
    const usedNames = new Set<string>();
    for (const song of songs) {
      const fileName = uniqueDocxName(song.title || "chant", usedNames);
      const buffer = await buildSongWordBuffer(song);
      zip.addFile(fileName, buffer);
    }

    const output = await dialog.showSaveDialog({
      title: "Exporter un pack DOCX",
      defaultPath: "chants-pack.zip",
      filters: [{ name: "ZIP", extensions: ["zip"] }],
    });
    if (output.canceled || !output.filePath) return { ok: false, canceled: true };
    await writeFile(output.filePath, zip.toBuffer());
    return { ok: true, path: output.filePath, count: songs.length, format: "PACK_ZIP_DOCX" };
  });
}
