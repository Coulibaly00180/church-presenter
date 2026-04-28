import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManagePlans } from "@/lib/roles"

type Params = { params: Promise<{ id: string }> }

const ItemSchema = z.object({
  order: z.number().int().min(0),
  kind: z.string().min(1),
  title: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  songId: z.string().optional().nullable(),
})

const BodySchema = z.object({
  items: z.array(ItemSchema),
})

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 })
  if (!canManagePlans(session.user.role)) {
    return NextResponse.json({ ok: false, error: "Accès refusé — rôle insuffisant" }, { status: 403 })
  }

  const { id: planId } = await params
  const body = await req.json()
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.errors[0].message }, { status: 400 })
  }

  const plan = await prisma.servicePlan.findUnique({ where: { id: planId } })
  if (!plan || plan.deletedAt) {
    return NextResponse.json({ ok: false, error: "Plan introuvable" }, { status: 404 })
  }

  const items = await prisma.$transaction(async (tx) => {
    await tx.serviceItem.deleteMany({ where: { planId } })
    return tx.serviceItem.createMany({
      data: parsed.data.items.map((it) => ({
        planId,
        order: it.order,
        kind: it.kind,
        title: it.title ?? null,
        content: it.content ?? null,
        songId: it.songId ?? null,
        refId: it.songId ?? null,
      })),
    })
  })

  return NextResponse.json({ ok: true, data: items })
}
