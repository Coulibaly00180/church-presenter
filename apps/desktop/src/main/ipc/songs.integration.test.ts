import { describe, expect, it } from "vitest";

import { createSongWithBlocksAtomic, type SongImportEntity } from "./songs";

function createFakeSongsPrisma(options?: { failOnBlockOrder?: number }) {
  const state = {
    songs: [] as Array<{ id: string; title: string }>,
    blocks: [] as Array<{ songId: string; order: number; content: string }>,
    nextSongId: 1,
  };

  return {
    state,
    async $transaction<T>(fn: (tx: unknown) => Promise<T>) {
      const draft = structuredClone(state);
      const tx = {
        song: {
          async create(args: { data: { title: string } }) {
            const created = { id: `song-${draft.nextSongId++}`, title: args.data.title };
            draft.songs.push(created);
            return created;
          },
        },
        songBlock: {
          async create(args: { data: { songId: string; order: number; content: string } }) {
            if (options?.failOnBlockOrder === args.data.order) {
              throw new Error("block write failure");
            }
            draft.blocks.push({
              songId: args.data.songId,
              order: args.data.order,
              content: args.data.content,
            });
            return args.data;
          },
        },
      };

      const result = await fn(tx);
      state.songs = draft.songs;
      state.blocks = draft.blocks;
      state.nextSongId = draft.nextSongId;
      return result;
    },
  };
}

describe("song import atomicity", () => {
  it("commits song + blocks in one transaction", async () => {
    const prisma = createFakeSongsPrisma();
    const entry: SongImportEntity = {
      title: "Grace",
      artist: "Artist",
      album: "Album",
      year: "2026",
      language: "fr",
      tags: "2026",
      blocks: [
        { order: 1, type: "VERSE", title: "v1", content: "line1" },
        { order: 2, type: "CHORUS", title: "c1", content: "line2" },
      ],
    };

    await createSongWithBlocksAtomic(prisma as never, entry);

    expect(prisma.state.songs).toHaveLength(1);
    expect(prisma.state.blocks).toHaveLength(2);
    expect(prisma.state.blocks.every((b) => b.songId === prisma.state.songs[0]?.id)).toBe(true);
  });

  it("rolls back song when a block fails", async () => {
    const prisma = createFakeSongsPrisma({ failOnBlockOrder: 2 });
    const entry: SongImportEntity = {
      title: "Broken",
      blocks: [
        { order: 1, type: "VERSE", title: "v1", content: "line1" },
        { order: 2, type: "CHORUS", title: "c1", content: "line2" },
      ],
    };

    await expect(createSongWithBlocksAtomic(prisma as never, entry)).rejects.toThrow("block write failure");
    expect(prisma.state.songs).toHaveLength(0);
    expect(prisma.state.blocks).toHaveLength(0);
  });
});
