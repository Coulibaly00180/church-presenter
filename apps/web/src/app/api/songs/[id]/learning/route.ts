import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const Schema = z.object({
  status: z.enum(["TO_LEARN", "IN_PROGRESS", "MASTERED"]),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 })

  const { id: songId } = await params
  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Statut invalide" }, { status: 400 })
  }

  const learning = await prisma.songLearning.upsert({
    where: { userId_songId: { userId: session.user.id, songId } },
    create: { userId: session.user.id, songId, status: parsed.data.status },
    update: { status: parsed.data.status },
  })

  return NextResponse.json({ ok: true, data: learning })
}
