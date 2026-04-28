import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PlanFormClient } from "@/components/plans/PlanFormClient"
import { canManagePlans } from "@/lib/roles"

type Props = { params: Promise<{ id: string }> }

export default async function EditPlanPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canManagePlans(session.user.role)) notFound()

  const { id } = await params

  const plan = await prisma.servicePlan.findUnique({
    where: { id },
    include: { items: { orderBy: { order: "asc" }, include: { song: { select: { id: true, title: true } } } } },
  })

  if (!plan || plan.deletedAt) notFound()

  return <PlanFormClient initial={plan} />
}
