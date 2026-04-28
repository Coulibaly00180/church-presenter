import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CreateUserSchema } from "@/lib/validations"
import { canAccessUserAdmin, canCreateUser, allowedRolesToAssign } from "@/lib/roles"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 })
  if (!canAccessUserAdmin(session.user.role)) {
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ ok: true, data: users })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 })
  if (!canCreateUser(session.user.role)) {
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = CreateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.errors[0].message }, { status: 400 })
  }

  // Vérifier que le créateur a le droit d'attribuer ce rôle
  const allowed = allowedRolesToAssign(session.user.role)
  if (!allowed.includes(parsed.data.role)) {
    return NextResponse.json(
      { ok: false, error: `Vous ne pouvez pas attribuer le rôle "${parsed.data.role}"` },
      { status: 403 }
    )
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) {
    return NextResponse.json({ ok: false, error: "Un utilisateur avec cet email existe déjà" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  })

  return NextResponse.json({ ok: true, data: user }, { status: 201 })
}
