import { ipcMain } from "electron";
import { getPrisma } from "../db";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { dialog } from "electron";
import mammoth from "mammoth";
import fs from "fs";

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
    const lines = value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    let title = "Sans titre";
    let artist: string | undefined;
    let album: string | undefined;
    let year: string | undefined;
    const blocksRaw: string[] = [];

    let inLyrics = false;
    for (const l of lines) {
      const lower = l.toLowerCase();
      if (lower.startsWith("titre")) {
        title = l.split(":").slice(1).join(":").trim() || title;
      } else if (lower.startsWith("auteur")) {
        artist = l.split(":").slice(1).join(":").trim() || undefined;
      } else if (lower.startsWith("album")) {
        album = l.split(":").slice(1).join(":").trim() || undefined;
      } else if (lower.startsWith("annee")) {
        year = l.split(":").slice(1).join(":").trim() || undefined;
      } else if (lower.startsWith("paroles")) {
        inLyrics = true;
      } else if (inLyrics) {
        blocksRaw.push(l);
      }
    }

    const paragraphBlocks = blocksRaw.join("\n").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

    const prisma = getPrisma();
    const created = await prisma.song.create({
      data: {
        title,
        artist,
        album,
        tags: year,
        blocks: {
          create:
            paragraphBlocks.length > 0
              ? paragraphBlocks.map((content, idx) => ({
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
                    content: blocksRaw.join("\n"),
                  },
                ],
        },
      },
      include: { blocks: { orderBy: { order: "asc" } } },
    });

    return { ok: true, song: created };
  });
}
