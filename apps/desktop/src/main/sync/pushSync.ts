import Database from "better-sqlite3";
import { app } from "electron";
import { join } from "path";
import { getPgClient } from "./pgClient";
import { databasePathFromUrl } from "../db";
import { getLastPullTimestamp, saveLastPushTimestamp } from "./syncState";

export type PushResult = {
  pushed: number;
  overwritten: number;
};

type LocalSong = {
  id: string; title: string; artist: string | null; album: string | null;
  year: string | null; language: string | null; tags: string | null;
  deletedAt: string | null; createdAt: string; updatedAt: string;
};
type LocalBlock = {
  id: string; songId: string; order: number; type: string;
  title: string | null; content: string; createdAt: string; updatedAt: string;
};
type LocalPlan = {
  id: string; date: string; title: string | null; backgroundConfig: string | null;
  deletedAt: string | null; createdAt: string; updatedAt: string;
};
type LocalItem = {
  id: string; planId: string; order: number; kind: string;
  refId: string | null; refSubId: string | null; songId: string | null;
  title: string | null; content: string | null; notes: string | null;
  mediaPath: string | null; secondaryContent: string | null;
  backgroundConfig: string | null; createdAt: string; updatedAt: string;
};

function getSqliteDb(): Database.Database {
  const url = process.env["DATABASE_URL"] ?? `file:${join(app.getPath("userData"), "app.db")}`;
  const dbPath = databasePathFromUrl(url, process.cwd());
  if (!dbPath) throw new Error("Cannot resolve SQLite path from DATABASE_URL");
  return new Database(dbPath);
}

export async function pushOfflineChanges(): Promise<PushResult> {
  const pg = getPgClient();
  const sqlite = getSqliteDb();
  const lastPullAt = getLastPullTimestamp();

  const localSongs = sqlite
    .prepare<[string], LocalSong>(`SELECT * FROM Song WHERE updatedAt > ?`)
    .all(lastPullAt);

  let pushed = 0;
  let overwritten = 0;

  for (const local of localSongs) {
    const blocks = sqlite
      .prepare<[string], LocalBlock>(`SELECT * FROM SongBlock WHERE songId = ? ORDER BY "order"`)
      .all(local.id);

    const remote = await pg.song.findUnique({ where: { id: local.id } });

    if (!remote) {
      await pg.song.create({
        data: {
          id: local.id,
          title: local.title,
          artist: local.artist,
          album: local.album,
          year: local.year,
          language: local.language,
          tags: local.tags,
          deletedAt: local.deletedAt ? new Date(local.deletedAt) : null,
          createdAt: new Date(local.createdAt),
          updatedAt: new Date(local.updatedAt),
          blocks: {
            create: blocks.map((b) => ({
              id: b.id,
              order: b.order,
              type: b.type,
              title: b.title,
              content: b.content,
              createdAt: new Date(b.createdAt),
              updatedAt: new Date(b.updatedAt),
            })),
          },
        },
      });
      pushed++;
    } else if (new Date(local.updatedAt) > remote.updatedAt) {
      // Local newer but PostgreSQL wins — count as overwritten
      overwritten++;
    }
  }

  // Plans
  const localPlans = sqlite
    .prepare<[string], LocalPlan>(`SELECT * FROM ServicePlan WHERE updatedAt > ?`)
    .all(lastPullAt);

  for (const local of localPlans) {
    const items = sqlite
      .prepare<[string], LocalItem>(`SELECT * FROM ServiceItem WHERE planId = ? ORDER BY "order"`)
      .all(local.id);

    const remote = await pg.servicePlan.findUnique({ where: { id: local.id } });

    if (!remote) {
      await pg.servicePlan.create({
        data: {
          id: local.id,
          date: new Date(local.date),
          title: local.title,
          backgroundConfig: local.backgroundConfig,
          deletedAt: local.deletedAt ? new Date(local.deletedAt) : null,
          createdAt: new Date(local.createdAt),
          updatedAt: new Date(local.updatedAt),
          items: {
            create: items.map((it) => ({
              id: it.id,
              order: it.order,
              kind: it.kind,
              refId: it.refId,
              refSubId: it.refSubId,
              songId: it.songId,
              title: it.title,
              content: it.content,
              notes: it.notes,
              mediaPath: it.mediaPath,
              secondaryContent: it.secondaryContent,
              backgroundConfig: it.backgroundConfig,
              createdAt: new Date(it.createdAt),
              updatedAt: new Date(it.updatedAt),
            })),
          },
        },
      });
      pushed++;
    } else if (new Date(local.updatedAt) > remote.updatedAt) {
      overwritten++;
    }
  }

  sqlite.close();
  saveLastPushTimestamp(new Date().toISOString());
  return { pushed, overwritten };
}
