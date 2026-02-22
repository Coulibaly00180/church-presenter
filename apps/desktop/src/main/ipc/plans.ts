import { dialog, ipcMain } from "electron";
import type { Prisma } from "@prisma/client";
import { readFile, writeFile } from "fs/promises";
import mammoth from "mammoth";
import { getPrisma } from "../db";
import { normalizeCpPlanItemKind } from "../../shared/planKinds";
import { validatePlanReorderPayload } from "./reorderValidation";
import {
  parseNonEmptyString,
  parsePlanAddItemPayload,
  parsePlanCreatePayload,
  parsePlanDuplicatePayload,
  parsePlanExportPayload,
  parsePlanRemoveItemPayload,
  parsePlanReorderPayload,
  parsePlanUpdatePayload,
  parsePlanUpdateItemPayload,
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

export async function createPlanItemWithRetry(
  prisma: ReturnType<typeof getPrisma>,
  payload: ReturnType<typeof parsePlanAddItemPayload>,
  maxRetries = 20
) {
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const lastItem = await tx.serviceItem.findFirst({
          where: { planId: payload.planId },
          orderBy: { order: "desc" },
          select: { order: true },
        });
        const order = (lastItem?.order ?? 0) + 1;
        return tx.serviceItem.create({
          data: {
            planId: payload.planId,
            order,
            kind: payload.kind,
            title: payload.title,
            content: payload.content,
            refId: payload.refId,
            refSubId: payload.refSubId,
            songId: payload.kind === "SONG_BLOCK" ? payload.refId : undefined,
            mediaPath: payload.mediaPath,
          },
        });
      });
    } catch (e: unknown) {
      if (!isUniqueConstraintError(e) || attempt === maxRetries - 1) {
        throw e;
      }
    }
  }
  throw new Error("Unable to allocate a unique plan item order");
}

export function registerPlansIpc() {
  ipcMain.handle("plans:list", async () => {
    const prisma = getPrisma();
    return prisma.servicePlan.findMany({
      where: { deletedAt: null },
      orderBy: { date: "desc" },
      select: { id: true, date: true, title: true, updatedAt: true },
      take: 200,
    });
  });

  ipcMain.handle("plans:get", async (_evt, rawPlanId: unknown) => {
    const prisma = getPrisma();
    const planId = parseNonEmptyString(rawPlanId, "plans:get.planId");
    const plan = await prisma.servicePlan.findUnique({
      where: { id: planId },
      include: { items: { orderBy: { order: "asc" } } },
    });
    if (!plan) return null;
    return {
      ...plan,
      items: plan.items.map((item) => ({
        ...item,
        kind: normalizeCpPlanItemKind(item.kind),
      })),
    };
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
                kind: normalizeCpPlanItemKind(it.kind),
                title: it.title,
                content: it.content,
                refId: it.refId,
                refSubId: it.refSubId,
                songId: it.songId,
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

  ipcMain.handle("plans:update", async (_evt, rawPayload: unknown) => {
    const prisma = getPrisma();
    const payload = parsePlanUpdatePayload(rawPayload);
    await prisma.servicePlan.update({
      where: { id: payload.planId },
      data: { title: payload.title },
    });
    return { ok: true };
  });

  ipcMain.handle("plans:delete", async (_evt, rawPlanId: unknown) => {
    const prisma = getPrisma();
    const planId = parseNonEmptyString(rawPlanId, "plans:delete.planId");
    await prisma.servicePlan.update({ where: { id: planId }, data: { deletedAt: new Date() } });
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
      return createPlanItemWithRetry(prisma, payload);
    }
  );

  ipcMain.handle("plans:updateItem", async (_evt, rawPayload: unknown) => {
    const prisma = getPrisma();
    const payload = parsePlanUpdateItemPayload(rawPayload);
    const item = await prisma.serviceItem.findUnique({
      where: { id: payload.itemId },
      select: { id: true, planId: true },
    });
    if (!item) throw new Error("Plan item not found");
    if (item.planId !== payload.planId) throw new Error("Item does not belong to this plan");

    await prisma.serviceItem.update({
      where: { id: payload.itemId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.content !== undefined ? { content: payload.content } : {}),
      },
    });
    return { ok: true };
  });

  ipcMain.handle("plans:removeItem", async (_evt, rawPayload: unknown) => {
    const prisma = getPrisma();
    const payload = parsePlanRemoveItemPayload(rawPayload);
    const item = await prisma.serviceItem.findUnique({
      where: { id: payload.itemId },
      select: { id: true, planId: true },
    });
    if (!item) return { ok: true }; // already deleted — idempotent
    if (item.planId !== payload.planId) throw new Error("Item does not belong to this plan");

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.serviceItem.deleteMany({ where: { id: payload.itemId } }); // no-op if already gone

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

    const normalizedPlan = {
      ...plan,
      items: plan.items.map((item) => ({
        ...item,
        kind: normalizeCpPlanItemKind(item.kind),
      })),
    };
    const data = JSON.stringify(normalizedPlan, null, 2);

    const res = await dialog.showSaveDialog({
      title: "Exporter le plan",
      defaultPath: `plan-${plan.id}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (res.canceled || !res.filePath) return { ok: false, canceled: true };

    await writeFile(res.filePath, data, "utf-8");

    return { ok: true, path: res.filePath };
  });

  ipcMain.handle("plans:importFromFile", async (_evt, rawPlanId: unknown) => {
    const prisma = getPrisma();
    const planId = parseNonEmptyString(rawPlanId, "plans:importFromFile.planId");

    const plan = await prisma.servicePlan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error("Plan not found");

    const res = await dialog.showOpenDialog({
      title: "Importer un programme",
      filters: [
        { name: "Documents", extensions: ["docx", "txt"] },
      ],
      properties: ["openFile"],
    });
    if (res.canceled || !res.filePaths.length) return { ok: false, canceled: true };

    const filePath = res.filePaths[0];
    const ext = filePath.toLowerCase().split(".").pop();
    let lines: string[] = [];

    if (ext === "docx") {
      const buffer = await readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      lines = result.value.split(/\n/).map((l: string) => l.trim()).filter(Boolean);
    } else {
      const text = await readFile(filePath, "utf-8");
      lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
    }

    if (lines.length === 0) return { ok: false, error: "Fichier vide" };

    let added = 0;
    for (const line of lines) {
      await createPlanItemWithRetry(prisma, {
        planId,
        kind: "ANNOUNCEMENT_TEXT",
        title: line.slice(0, 100),
        content: line,
      });
      added++;
    }

    return { ok: true, added };
  });
}
