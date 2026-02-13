import { dialog, ipcMain } from "electron";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "../db";
import { validatePlanReorderPayload } from "./reorderValidation";
import {
  parseNonEmptyString,
  parsePlanAddItemPayload,
  parsePlanCreatePayload,
  parsePlanDuplicatePayload,
  parsePlanExportPayload,
  parsePlanRemoveItemPayload,
  parsePlanReorderPayload,
} from "./runtimeValidation";

function normalizeDateToMidnight(dateIso: string) {
  const ymd = dateIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const d = Number(ymd[3]);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  }

  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date");
  }
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0));
}

function addUtcDays(date: Date, days: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days, 0, 0, 0, 0));
}

function isUniqueConstraintError(err: unknown) {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
}

export function registerPlansIpc() {
  ipcMain.handle("plans:list", async () => {
    const prisma = getPrisma();
    return prisma.servicePlan.findMany({
      orderBy: { date: "desc" },
      select: { id: true, date: true, title: true, updatedAt: true },
      take: 200,
    });
  });

  ipcMain.handle("plans:get", async (_evt, rawPlanId: unknown) => {
    const prisma = getPrisma();
    const planId = parseNonEmptyString(rawPlanId, "plans:get.planId");
    return prisma.servicePlan.findUnique({
      where: { id: planId },
      include: { items: { orderBy: { order: "asc" } } },
    });
  });

  ipcMain.handle("plans:duplicate", async (_evt, rawPayload: unknown) => {
    const prisma = getPrisma();
    const payload = parsePlanDuplicatePayload(rawPayload);
    const base = await prisma.servicePlan.findUnique({
      where: { id: payload.planId },
      include: { items: { orderBy: { order: "asc" } } },
    });
    if (!base) throw new Error("Plan not found");

    let candidateDate = normalizeDateToMidnight(payload.dateIso || base.date.toISOString());
    const title = payload.title?.trim() || base.title || "Culte";

    for (let attempt = 0; attempt < 3660; attempt += 1) {
      try {
        return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const created = await tx.servicePlan.create({
            data: { date: candidateDate, title },
          });

          for (const it of base.items) {
            await tx.serviceItem.create({
              data: {
                planId: created.id,
                order: it.order,
                kind: it.kind,
                title: it.title,
                content: it.content,
                refId: it.refId,
                refSubId: it.refSubId,
                mediaPath: it.mediaPath,
              },
            });
          }

          return tx.servicePlan.findUnique({
            where: { id: created.id },
            include: { items: { orderBy: { order: "asc" } } },
          });
        });
      } catch (e) {
        if (!isUniqueConstraintError(e)) throw e;
        candidateDate = addUtcDays(candidateDate, 1);
      }
    }

    throw new Error("Unable to find an available plan date");
  });

  ipcMain.handle("plans:create", async (_evt, rawPayload: unknown) => {
    const prisma = getPrisma();
    const payload = parsePlanCreatePayload(rawPayload);
    let candidateDate = normalizeDateToMidnight(payload.dateIso);
    const title = payload.title ?? "Culte";

    for (let attempt = 0; attempt < 3660; attempt += 1) {
      try {
        return await prisma.servicePlan.create({
          data: { date: candidateDate, title },
          include: { items: { orderBy: { order: "asc" } } },
        });
      } catch (e) {
        if (!isUniqueConstraintError(e)) throw e;
        candidateDate = addUtcDays(candidateDate, 1);
      }
    }

    throw new Error("Unable to find an available plan date");
  });

  ipcMain.handle("plans:delete", async (_evt, rawPlanId: unknown) => {
    const prisma = getPrisma();
    const planId = parseNonEmptyString(rawPlanId, "plans:delete.planId");
    await prisma.servicePlan.delete({ where: { id: planId } });
    return { ok: true };
  });

  ipcMain.handle(
    "plans:addItem",
    async (
      _evt,
      rawPayload: unknown
    ) => {
      const prisma = getPrisma();
      const payload = parsePlanAddItemPayload(rawPayload);
      const count = await prisma.serviceItem.count({ where: { planId: payload.planId } });
      const order = count + 1;

      return prisma.serviceItem.create({
        data: {
          planId: payload.planId,
          order,
          kind: payload.kind,
          title: payload.title,
          content: payload.content,
          refId: payload.refId,
          refSubId: payload.refSubId,
          mediaPath: payload.mediaPath,
        },
      });
    }
  );

  ipcMain.handle("plans:removeItem", async (_evt, rawPayload: unknown) => {
    const prisma = getPrisma();
    const payload = parsePlanRemoveItemPayload(rawPayload);
    const item = await prisma.serviceItem.findUnique({
      where: { id: payload.itemId },
      select: { id: true, planId: true },
    });
    if (!item) throw new Error("Plan item not found");
    if (item.planId !== payload.planId) throw new Error("Item does not belong to this plan");

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.serviceItem.delete({ where: { id: payload.itemId } });

      const items = await tx.serviceItem.findMany({
        where: { planId: payload.planId },
        orderBy: { order: "asc" },
        select: { id: true },
      });

      for (const [idx, it] of items.entries()) {
        await tx.serviceItem.update({ where: { id: it.id }, data: { order: idx + 1 } });
      }
    });

    return { ok: true };
  });

  ipcMain.handle("plans:reorder", async (_evt, rawPayload: unknown) => {
    const prisma = getPrisma();
    const payload = parsePlanReorderPayload(rawPayload);
    const currentItems = await prisma.serviceItem.findMany({
      where: { planId: payload.planId },
      orderBy: { order: "asc" },
      select: { id: true },
    });

    const currentIds = currentItems.map((it: { id: string }) => it.id);
    const requestedIds = payload.orderedItemIds ?? [];
    validatePlanReorderPayload(currentIds, requestedIds);

    await prisma.$transaction(
      requestedIds.map((id, idx) => prisma.serviceItem.update({ where: { id }, data: { order: idx + 1 } }))
    );
    return { ok: true };
  });

  ipcMain.handle("plans:export", async (_evt, rawPayload: unknown) => {
    const prisma = getPrisma();
    const payload = parsePlanExportPayload(rawPayload);
    const plan = await prisma.servicePlan.findUnique({
      where: { id: payload.planId },
      include: { items: { orderBy: { order: "asc" } } },
    });
    if (!plan) throw new Error("Plan not found");

    const data = JSON.stringify(plan, null, 2);

    const res = await dialog.showSaveDialog({
      title: "Exporter le plan",
      defaultPath: `plan-${plan.id}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (res.canceled || !res.filePath) return { ok: false, canceled: true };

    const fs = await import("fs");
    fs.writeFileSync(res.filePath, data, "utf-8");

    return { ok: true, path: res.filePath };
  });
}
