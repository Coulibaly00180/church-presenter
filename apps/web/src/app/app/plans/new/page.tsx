import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PlanFormClient } from "@/components/plans/PlanFormClient"

export default async function NewPlanPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") notFound()

  return <PlanFormClient />
}
