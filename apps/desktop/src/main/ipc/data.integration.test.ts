import { describe, expect, it } from "vitest";

import {
  createPlanWithItems,
  importNormalizedDataMerge,
  normalizePlans,
  type DataNormalizedPlan,
  type DataNormalizedSong,
} from "./data";

function createFakeDataPrisma(options?: { failSongTitles?: Set<string>; failPlanTitles?: Set<string> }) {
  const state = {
    songs: [] as Array<{ id: string; title: string }>,
    songBlocks: [] as Array<{ songId: string; order: number }>,
    plans: [] as Array<{ id: string; title: string; date?: Date; backgroundConfig?: string }>,
    planItems: [] as Array<{
      planId: string;
      order: number;
      kind?: string;
      title?: string;
      content?: string;
      refId?: string;
      refSubId?: string;
      mediaPath?: string;
      notes?: string;
      secondaryContent?: string;
      backgroundConfig?: string;
    }>,
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
          async create(args: { data: { title: string; date?: Date; backgroundConfig?: string } }) {
            if (options?.failPlanTitles?.has(args.data.title)) {
              throw new Error(`plan failed: ${args.data.title}`);
            }
            const created = {
              id: `plan-${draft.nextPlanId++}`,
              title: args.data.title,
              date: args.data.date,
              backgroundConfig: args.data.backgroundConfig,
            };
            draft.plans.push(created);
            return created;
          },
        },
        serviceItem: {
          async create(args: {
            data: {
              planId: string;
              order: number;
              kind?: string;
              title?: string;
              content?: string;
              refId?: string;
              refSubId?: string;
              mediaPath?: string;
              notes?: string;
              secondaryContent?: string;
              backgroundConfig?: string;
            };
          }) {
            draft.planItems.push(args.data);
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

  it("preserves rich plan metadata through normalization", () => {
    const errors: Array<{ kind: string; title?: string; message: string }> = [];
    const plans = normalizePlans([
      {
        date: "2026-04-06",
        title: "Plan riche",
        backgroundConfig: "{\"background\":\"#000000\"}",
        items: [
          {
            order: 1,
            kind: "ANNOUNCEMENT_TEXT",
            title: "Bienvenue",
            content: "Bonjour",
            notes: "Note régie",
            secondaryContent: "[{\"label\":\"LSG\",\"body\":\"Texte\"}]",
            backgroundConfig: "{\"foreground\":\"#ffffff\"}",
          },
        ],
      },
      {
        date: "2026-04-07",
        title: "Plan legacy",
        items: [{ kind: "ANNOUNCEMENT_TEXT", content: "Sans métadonnées" }],
      },
    ], errors);

    expect(errors).toEqual([]);
    expect(plans[0]).toMatchObject({
      title: "Plan riche",
      backgroundConfig: "{\"background\":\"#000000\"}",
    });
    expect(plans[0]?.items[0]).toMatchObject({
      notes: "Note régie",
      secondaryContent: "[{\"label\":\"LSG\",\"body\":\"Texte\"}]",
      backgroundConfig: "{\"foreground\":\"#ffffff\"}",
    });
    expect(plans[1]).toMatchObject({ backgroundConfig: undefined });
    expect(plans[1]?.items[0]).toMatchObject({
      notes: undefined,
      secondaryContent: undefined,
      backgroundConfig: undefined,
    });
  });

  it("persists rich plan metadata when creating imported plans", async () => {
    const prisma = createFakeDataPrisma();
    const plan: DataNormalizedPlan = {
      date: "2026-04-06",
      title: "Plan importé",
      backgroundConfig: "{\"background\":\"#111111\"}",
      items: [
        {
          order: 1,
          kind: "ANNOUNCEMENT_TEXT",
          title: "Annonce",
          content: "Texte",
          notes: "Régie",
          secondaryContent: "[{\"label\":\"BDS\",\"body\":\"Texte\"}]",
          backgroundConfig: "{\"foreground\":\"#eeeeee\"}",
        },
      ],
    };

    await prisma.$transaction((tx) => createPlanWithItems(tx as never, plan));

    expect(prisma.state.plans).toHaveLength(1);
    expect(prisma.state.plans[0]).toMatchObject({
      title: "Plan importé",
      backgroundConfig: "{\"background\":\"#111111\"}",
    });
    expect(prisma.state.planItems).toHaveLength(1);
    expect(prisma.state.planItems[0]).toMatchObject({
      kind: "ANNOUNCEMENT_TEXT",
      notes: "Régie",
      secondaryContent: "[{\"label\":\"BDS\",\"body\":\"Texte\"}]",
      backgroundConfig: "{\"foreground\":\"#eeeeee\"}",
    });
  });
});
