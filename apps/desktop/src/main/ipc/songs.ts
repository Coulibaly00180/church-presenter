import { ipcMain } from "electron";
import { getPrisma } from "../db";

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
}
