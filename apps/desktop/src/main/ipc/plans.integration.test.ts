import { describe, expect, it } from "vitest";

import { createPlanItemWithRetry, duplicatePlanWithRetry } from "./plans";

function sleep(ms: number) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function createFakePlansPrisma() {
  const state: Array<{ id: string; planId: string; order: number }> = [];
  let nextId = 1;

  const tx = {
    serviceItem: {
      async findFirst(args: { where: { planId: string } }) {
        await sleep(Math.floor(Math.random() * 3));
        const items = state.filter((it) => it.planId === args.where.planId);
        if (items.length === 0) return null;
        const maxOrder = Math.max(...items.map((it) => it.order));
        return { order: maxOrder };
      },
      async create(args: { data: { planId: string; order: number } }) {
        await sleep(Math.floor(Math.random() * 3));
        const exists = state.some((it) => it.planId === args.data.planId && it.order === args.data.order);
        if (exists) {
          const err = new Error("Unique constraint violation") as Error & { code?: string };
          err.code = "P2002";
          throw err;
        }
        const created = { id: String(nextId++), planId: args.data.planId, order: args.data.order };
        state.push(created);
        return created;
      },
    },
  };

  return {
    state,
    async $transaction<T>(fn: (client: typeof tx) => Promise<T>) {
      return fn(tx);
    },
  };
}

function createFakeDuplicatePlansPrisma() {
  const state = {
    plans: [] as Array<{ id: string; date: Date; title: string; backgroundConfig?: string | null }>,
    items: [] as Array<{
      id: string;
      planId: string;
      order: number;
      kind: string;
      title?: string | null;
      content?: string | null;
      refId?: string | null;
      refSubId?: string | null;
      songId?: string | null;
      mediaPath?: string | null;
      notes?: string | null;
      secondaryContent?: string | null;
      backgroundConfig?: string | null;
    }>,
    nextPlanId: 1,
    nextItemId: 1,
  };

  const tx = {
    servicePlan: {
      async create(args: { data: { date: Date; title: string; backgroundConfig?: string | null } }) {
        const created = {
          id: `plan-${state.nextPlanId++}`,
          date: args.data.date,
          title: args.data.title,
          backgroundConfig: args.data.backgroundConfig,
        };
        state.plans.push(created);
        return created;
      },
      async findUnique(args: { where: { id: string } }) {
        const plan = state.plans.find((entry) => entry.id === args.where.id);
        if (!plan) return null;
        return {
          ...plan,
          items: state.items
            .filter((item) => item.planId === plan.id)
            .sort((a, b) => a.order - b.order),
        };
      },
    },
    serviceItem: {
      async create(args: {
        data: {
          planId: string;
          order: number;
          kind: string;
          title?: string | null;
          content?: string | null;
          refId?: string | null;
          refSubId?: string | null;
          songId?: string | null;
          mediaPath?: string | null;
          notes?: string | null;
          secondaryContent?: string | null;
          backgroundConfig?: string | null;
        };
      }) {
        const created = { id: `item-${state.nextItemId++}`, ...args.data };
        state.items.push(created);
        return created;
      },
    },
  };

  return {
    state,
    async $transaction<T>(fn: (client: typeof tx) => Promise<T>) {
      return fn(tx);
    },
  };
}

describe("plans helpers", () => {
  it("allocates unique contiguous orders under concurrent inserts", async () => {
    const prisma = createFakePlansPrisma();
    const payload = {
      planId: "plan-1",
      kind: "ANNOUNCEMENT_TEXT" as const,
      title: "Item",
      content: "text",
    };

    await Promise.all(Array.from({ length: 100 }, () => createPlanItemWithRetry(prisma as never, payload, 100)));

    const orders = prisma.state.map((it) => it.order).sort((a, b) => a - b);
    expect(orders).toHaveLength(100);
    expect(new Set(orders).size).toBe(100);
    expect(orders).toEqual(Array.from({ length: 100 }, (_, idx) => idx + 1));
  });

  it("duplicates plan background and rich item fields", async () => {
    const prisma = createFakeDuplicatePlansPrisma();
    const base = {
      date: new Date(Date.UTC(2026, 3, 6, 0, 0, 0, 0)),
      title: "Culte du dimanche",
      backgroundConfig: "{\"background\":\"#101010\"}",
      items: [
        {
          order: 1,
          kind: "ANNOUNCEMENT_TEXT",
          title: "Bienvenue",
          content: "Bonjour",
          refId: "song-1",
          refSubId: "block-1",
          songId: "song-1",
          mediaPath: "C:\\media\\slide.png",
          notes: "Note régie",
          secondaryContent: "[{\"label\":\"LSG\",\"body\":\"Texte\"}]",
          backgroundConfig: "{\"foreground\":\"#ffffff\"}",
        },
      ],
    };

    const duplicated = await duplicatePlanWithRetry(
      prisma as never,
      base,
      { planId: "source-plan" } as never,
      1,
    );

    expect(duplicated).not.toBeNull();
    expect(duplicated).toMatchObject({
      title: "Culte du dimanche",
      backgroundConfig: "{\"background\":\"#101010\"}",
    });
    expect(duplicated?.items).toHaveLength(1);
    expect(duplicated?.items[0]).toMatchObject({
      order: 1,
      kind: "ANNOUNCEMENT_TEXT",
      title: "Bienvenue",
      content: "Bonjour",
      refId: "song-1",
      refSubId: "block-1",
      songId: "song-1",
      mediaPath: "C:\\media\\slide.png",
      notes: "Note régie",
      secondaryContent: "[{\"label\":\"LSG\",\"body\":\"Texte\"}]",
      backgroundConfig: "{\"foreground\":\"#ffffff\"}",
    });
  });
});
