import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canChangeUserRole, canDeleteUser, canAccessUserAdmin } from "@/lib/roles"

type Params = { params: Promise<{ id: string }> }

const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "RESPONSABLE_CHANTRE", "CHANTRE", "LECTEUR"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
})

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 })

  const { id } = await params
  const isSelf = session.user.id === id
  const isAdmin = session.user.role === "ADMIN"
  const isManager = canAccessUserAdmin(session.user.role)

  // Seul soi-même ou un gestionnaire peut modifier un utilisateur
  if (!isSelf && !isManager) {
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = UpdateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { password, role, isActive, ...rest } = parsed.data

  // Changer le rôle ou activer/désactiver : ADMIN seulement
  const privileged: Record<string, unknown> = {}
  if (role !== undefined) {
    if (!canChangeUserRole(session.user.role)) {
      return NextResponse.json({ ok: false, error: "Seul un administrateur peut modifier les rôles" }, { status: 403 })
    }
    privileged.role = role
  }
  if (isActive !== undefined) {
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Seul un administrateur peut activer/désactiver un compte" }, { status: 403 })
    }
    privileged.isActive = isActive
  }

  const data: Record<string, unknown> = { ...rest, ...privileged }
  if (password) data.passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, isActive: true, updatedAt: true },
  })

  return NextResponse.json({ ok: true, data: user })
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 })
  if (!canDeleteUser(session.user.role)) {
    return NextResponse.json({ ok: false, error: "Seul un administrateur peut supprimer des utilisateurs" }, { status: 403 })
  }

  const { id } = await params

  if (session.user.id === id) {
    return NextResponse.json({ ok: false, error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 400 })
  }

  await prisma.user.delete({ where: { id } })

  return NextResponse.json({ ok: true, data: { id } })
}
