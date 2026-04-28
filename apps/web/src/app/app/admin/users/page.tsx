import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { UserTableClient } from "@/components/admin/UserTableClient"
import { canAccessUserAdmin } from "@/lib/roles"

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canAccessUserAdmin(session.user.role)) notFound()

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  })

  return (
    <UserTableClient
      users={users}
      currentUserId={session.user.id}
      currentUserRole={session.user.role}
    />
  )
}
