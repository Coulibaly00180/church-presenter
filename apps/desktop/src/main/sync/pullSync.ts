import Database from "better-sqlite3";
import { app } from "electron";
import { join } from "path";
import { getPgClient } from "./pgClient";
import { databasePathFromUrl } from "../db";

function getSqliteDb(): Database.Database {
  const url = process.env["DATABASE_URL"] ?? `file:${join(app.getPath("userData"), "app.db")}`;
  const dbPath = databasePathFromUrl(url, process.cwd());
  if (!dbPath) throw new Error("Cannot resolve SQLite path from DATABASE_URL");
  return new Database(dbPath);
}

export async function pullFromPostgres(): Promise<void> {
  const pg = getPgClient();
  const sqlite = getSqliteDb();

  const [songs, plans] = await Promise.all([
    pg.song.findMany({ include: { blocks: true } }),
    pg.servicePlan.findMany({ include: { items: true } }),
  ]);

  const replaceAll = sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM SongBlock").run();
    sqlite.prepare("DELETE FROM Song").run();
    sqlite.prepare("DELETE FROM ServiceItem").run();
    sqlite.prepare("DELETE FROM ServicePlan").run();

    const insertSong = sqlite.prepare(`
      INSERT INTO Song
        (id, title, artist, album, year, language, tags, deletedAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertBlock = sqlite.prepare(`
      INSERT INTO SongBlock (id, songId, "order", type, title, content, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertPlan = sqlite.prepare(`
      INSERT INTO ServicePlan (id, date, title, backgroundConfig, deletedAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertItem = sqlite.prepare(`
      INSERT INTO ServiceItem
        (id, planId, "order", kind, refId, refSubId, songId, title, content, notes,
         mediaPath, secondaryContent, backgroundConfig, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const song of songs) {
      insertSong.run(
        song.id, song.title, song.artist ?? null, song.album ?? null,
        song.year ?? null, song.language ?? null,
        song.tags ?? null,
        song.deletedAt ? song.deletedAt.toISOString() : null,
        song.createdAt.toISOString(), song.updatedAt.toISOString()
      );
      for (const block of song.blocks) {
        insertBlock.run(
          block.id, block.songId, block.order, block.type,
          block.title ?? null, block.content,
          block.createdAt.toISOString(), block.updatedAt.toISOString()
        );
      }
    }

    for (const plan of plans) {
      insertPlan.run(
        plan.id, plan.date.toISOString(), plan.title ?? null,
        plan.backgroundConfig ?? null,
        plan.deletedAt ? plan.deletedAt.toISOString() : null,
        plan.createdAt.toISOString(), plan.updatedAt.toISOString()
      );
      for (const item of plan.items) {
        insertItem.run(
          item.id, item.planId, item.order, item.kind,
          item.refId ?? null, item.refSubId ?? null, item.songId ?? null,
          item.title ?? null, item.content ?? null, item.notes ?? null,
          item.mediaPath ?? null, item.secondaryContent ?? null,
          item.backgroundConfig ?? null,
          item.createdAt.toISOString(), item.updatedAt.toISOString()
        );
      }
    }
  });

  replaceAll();
  sqlite.close();
}
