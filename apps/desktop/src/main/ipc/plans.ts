import { ipcMain } from "electron";
import { getPrisma } from "../db";

function normalizeDateToMidnightIso(dateIso: string) {
  // Attend "YYYY-MM-DD" ou ISO ; on normalise à 00:00:00
  const d = new Date(dateIso);
  d.setHours(0, 0, 0, 0);
  return d;
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

  ipcMain.handle("plans:get", async (_evt, planId: string) => {
    const prisma = getPrisma();
    return prisma.servicePlan.findUnique({
      where: { id: planId },
      include: { items: { orderBy: { order: "asc" } } },
    });
  });

  ipcMain.handle("plans:create", async (_evt, payload: { dateIso: string; title?: string }) => {
    const prisma = getPrisma();
    const date = normalizeDateToMidnightIso(payload.dateIso);

    return prisma.servicePlan.create({
      data: { date, title: payload.title ?? "Culte" },
      include: { items: { orderBy: { order: "asc" } } },
    });
  });

  ipcMain.handle("plans:delete", async (_evt, planId: string) => {
    const prisma = getPrisma();
    await prisma.servicePlan.delete({ where: { id: planId } });
    return { ok: true };
  });

  ipcMain.handle(
    "plans:addItem",
    async (
      _evt,
      payload: {
        planId: string;
        kind: string;
        title?: string;
        content?: string;
        refId?: string;
        refSubId?: string;
        mediaPath?: string;
      }
    ) => {
      const prisma = getPrisma();
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

  ipcMain.handle("plans:removeItem", async (_evt, payload: { planId: string; itemId: string }) => {
    const prisma = getPrisma();
    await prisma.serviceItem.delete({ where: { id: payload.itemId } });

    // renumérote
    const items = await prisma.serviceItem.findMany({
      where: { planId: payload.planId },
      orderBy: { order: "asc" },
    });

    await prisma.$transaction(
      items.map((it, idx) =>
        prisma.serviceItem.update({ where: { id: it.id }, data: { order: idx + 1 } })
      )
    );

    return { ok: true };
  });

  ipcMain.handle("plans:reorder", async (_evt, payload: { planId: string; orderedItemIds: string[] }) => {
    const prisma = getPrisma();
    await prisma.$transaction(
      payload.orderedItemIds.map((id, idx) =>
        prisma.serviceItem.update({ where: { id }, data: { order: idx + 1 } })
      )
    );
    return { ok: true };
  });
}
