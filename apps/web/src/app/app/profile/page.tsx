import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ProfileClient } from "@/components/profile/ProfileClient"

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { id: true, firstName: true, lastName: true, username: true, name: true, email: true, role: true, createdAt: true, lastLoginAt: true },
  })

  const [favCount, masteredCount] = await Promise.all([
    prisma.favorite.count({ where: { userId: user.id } }),
    prisma.songLearning.count({ where: { userId: user.id, status: "MASTERED" } }),
  ])

  return <ProfileClient user={user} favCount={favCount} masteredCount={masteredCount} />
}
