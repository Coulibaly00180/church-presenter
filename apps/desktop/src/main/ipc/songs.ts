import { dialog, ipcMain } from "electron";
import { getPrisma } from "../db";
import { Document, Packer, Paragraph, TextRun } from "docx";
import mammoth from "mammoth";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

const SUPPORTED_DOC_EXTENSIONS = [".docx", ".odt"];

function splitBlocks(text: string) {
  return text
    .split(/\n\s*\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseSongText(raw: string, filename?: string) {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let title =
    lines.find((l) => /^titre\s*:/i.test(l))?.split(":").slice(1).join(":").trim() ||
    filename?.replace(/\.(docx|odt)$/i, "") ||
    "Sans titre";
  const artist = lines.find((l) => /^auteur\s*:/i.test(l))?.split(":").slice(1).join(":").trim();
  const album = lines.find((l) => /^album\s*:/i.test(l))?.split(":").slice(1).join(":").trim();
  const year =
    lines.find((l) => /^ann[eé]e/i.test(l))?.split(":").slice(1).join(":").trim() ||
    lines.find((l) => /^année de parution/i.test(l))?.split(":").slice(1).join(":").trim();

  // Lyrics: everything after a line starting with "Paroles" OR the whole text minus metadata
  let lyrics = "";
  const parolesIdx = lines.findIndex((l) => /^paroles\s*:?/i.test(l));
  if (parolesIdx >= 0) {
    lyrics = lines.slice(parolesIdx + 1).join("\n");
  } else {
    const metaKeys = ["titre", "auteur", "album", "ann", "année", "annee"];
    lyrics = lines
      .filter((l) => !metaKeys.some((k) => l.toLowerCase().startsWith(k)))
      .join("\n");
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

async function importDocSong(prisma: any, filePath: string) {
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

async function importJsonFile(prisma: any, filePath: string) {
  const raw = fs.readFileSync(filePath, "utf-8");
  let payload: any = JSON.parse(raw);
  if (Array.isArray(payload)) {
    // ok
  } else if (payload?.songs && Array.isArray(payload.songs)) {
    payload = payload.songs;
  } else if (typeof payload === "object") {
    payload = [payload]; // accepte un seul chant
  } else {
    throw new Error("Le fichier doit contenir un tableau de chants ou un objet unique.");
  }

  let imported = 0;
  const errors: Array<{ path: string; title?: string; message: string }> = [];
  for (const s of payload) {
    try {
      const meta = s.meta || {};
      // blocs : accepte soit blocks[], soit lyrics (string) qu'on découpe en paragraphes
      let blocks: any[] = Array.isArray(s.blocks) ? s.blocks : [];
      const lyrics = s.lyrics || s.paroles || meta.paroles;
      if ((!blocks || blocks.length === 0) && typeof lyrics === "string") {
        blocks = splitBlocks(lyrics).map((content, idx) => ({
          order: idx + 1,
          type: idx === 0 ? "VERSE" : "CHORUS",
          title: idx === 0 ? "Couplet" : "Refrain",
          content,
        }));
      }
      // année dans tags ou year
      const year = s.year || s.annee || s.published || s.release_year || meta.annee_de_sortie_single;
      const tags = s.tags || (year != null ? String(year).slice(0, 10) : undefined);
      const title = s.title || s.titre || meta.titre || "Sans titre";
      const artist = s.artist || s.auteur || meta.auteur_interprete || meta.auteur || meta.interprete;
      const album = s.album || meta.album_inclus_dans;
      const language = s.language || s.lang || meta.langue;

      const song = await prisma.song.create({
        data: {
          title,
          artist,
          album,
          language,
          tags,
        },
      });
      for (const b of blocks) {
        await prisma.songBlock.create({
          data: {
            songId: song.id,
            order: b.order || 1,
            type: b.type || "VERSE",
            title: b.title,
            content: (b.content || "").trim(),
          },
        });
      }
      imported += 1;
    } catch (e: any) {
      errors.push({ path: filePath, title: s?.title, message: e?.message || String(e) });
    }
  }
  return { imported, errors };
}

type BlockInput = {
  order: number;
  type: string;
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
    return prisma.$transaction(async (tx: any) => {
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

    const lyrics = (song.blocks || []).map((b) => (b.content || "").trim()).filter(Boolean).join("\n\n");
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({ children: [new TextRun({ text: `Titre : ${song.title}`, bold: true })] }),
            new Paragraph(`Auteur : ${song.artist || ""}`),
            new Paragraph(`Année de parution : ${""}`),
            new Paragraph(`Album : ${song.album || ""}`),
            new Paragraph(""),
            new Paragraph({ children: [new TextRun({ text: "Paroles :", bold: true })] }),
            ...lyrics.split("\n").map((line) => new Paragraph(line)),
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
    } catch (e: any) {
      return { ok: false, error: e?.message || String(e) };
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
      } catch (e: any) {
        errors.push({ path: p, message: e?.message || String(e) });
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
      } catch (e: any) {
        errors.push({ path: p, message: e?.message || String(e) });
      }
    }

    return { ok: true, imported, docFiles, jsonFiles, errors, files: res.filePaths };
  });
}
