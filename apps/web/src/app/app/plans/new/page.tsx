import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PlanFormClient } from "@/components/plans/PlanFormClient"
import { canManagePlans } from "@/lib/roles"

export default async function NewPlanPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canManagePlans(session.user.role)) notFound()

  return <PlanFormClient />
}
