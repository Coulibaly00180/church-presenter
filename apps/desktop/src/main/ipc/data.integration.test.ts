import { describe, expect, it } from "vitest";

import { importNormalizedDataMerge, type DataNormalizedPlan, type DataNormalizedSong } from "./data";

function createFakeDataPrisma(options?: { failSongTitles?: Set<string>; failPlanTitles?: Set<string> }) {
  const state = {
    songs: [] as Array<{ id: string; title: string }>,
    songBlocks: [] as Array<{ songId: string; order: number }>,
    plans: [] as Array<{ id: string; title: string }>,
    planItems: [] as Array<{ planId: string; order: number }>,
    nextSongId: 1,
    nextPlanId: 1,
  };

  return {
    state,
    async $transaction<T>(fn: (tx: unknown) => Promise<T>) {
      const draft = structuredClone(state);
      const tx = {
        song: {
          async create(args: { data: { title: string } }) {
            if (options?.failSongTitles?.has(args.data.title)) {
              throw new Error(`song failed: ${args.data.title}`);
            }
            const created = { id: `song-${draft.nextSongId++}`, title: args.data.title };
            draft.songs.push(created);
            return created;
          },
        },
        songBlock: {
          async create(args: { data: { songId: string; order: number } }) {
            draft.songBlocks.push({ songId: args.data.songId, order: args.data.order });
            return args.data;
          },
        },
        servicePlan: {
          async create(args: { data: { title: string } }) {
            if (options?.failPlanTitles?.has(args.data.title)) {
              throw new Error(`plan failed: ${args.data.title}`);
            }
            const created = { id: `plan-${draft.nextPlanId++}`, title: args.data.title };
            draft.plans.push(created);
            return created;
          },
        },
        serviceItem: {
          async create(args: { data: { planId: string; order: number } }) {
            draft.planItems.push({ planId: args.data.planId, order: args.data.order });
            return args.data;
          },
        },
      };

      const result = await fn(tx);
      state.songs = draft.songs;
      state.songBlocks = draft.songBlocks;
      state.plans = draft.plans;
      state.planItems = draft.planItems;
      state.nextSongId = draft.nextSongId;
      state.nextPlanId = draft.nextPlanId;
      return result;
    },
  };
}

describe("data import atomicity", () => {
  const songs: DataNormalizedSong[] = [
    {
      title: "Song OK",
      blocks: [{ order: 1, type: "VERSE", content: "ok" }],
    },
    {
      title: "Song BAD",
      blocks: [{ order: 1, type: "VERSE", content: "bad" }],
    },
  ];

  const plans: DataNormalizedPlan[] = [
    {
      title: "Plan OK",
      items: [{ order: 1, kind: "ANNOUNCEMENT_TEXT", content: "hello" }],
    },
  ];

  it("MERGE ENTITY persists valid entities and isolates invalid ones", async () => {
    const prisma = createFakeDataPrisma({ failSongTitles: new Set(["Song BAD"]) });
    const result = await importNormalizedDataMerge(prisma as never, songs, plans, "ENTITY", []);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.counts).toEqual({ songs: 1, plans: 1 });
      expect(result.errors.some((e) => e.kind === "song" && e.title === "Song BAD")).toBe(true);
    }
    expect(prisma.state.songs).toHaveLength(1);
    expect(prisma.state.plans).toHaveLength(1);
  });

  it("MERGE STRICT rolls back the whole batch on one failure", async () => {
    const prisma = createFakeDataPrisma({ failSongTitles: new Set(["Song BAD"]) });
    const result = await importNormalizedDataMerge(prisma as never, songs, plans, "STRICT", []);

    expect(result).toMatchObject({ ok: false, rolledBack: true });
    expect(prisma.state.songs).toHaveLength(0);
    expect(prisma.state.plans).toHaveLength(0);
  });
});
