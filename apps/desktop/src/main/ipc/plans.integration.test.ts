import { describe, expect, it } from "vitest";

import { createPlanItemWithRetry } from "./plans";

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

describe("plans:addItem concurrency", () => {
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
});
