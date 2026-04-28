import Link from "next/link"
import { CalendarDays, Plus, ArrowRight } from "lucide-react"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { canManagePlans } from "@/lib/roles"

export default async function PlansPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const plans = await prisma.servicePlan.findMany({
    where: { deletedAt: null },
    orderBy: { date: "desc" },
    include: {
      _count: { select: { items: true } },
    },
  })

  const now = new Date()
  const upcoming = plans.filter((p) => new Date(p.date) >= now)
  const past = plans.filter((p) => new Date(p.date) < now)

  function formatDate(d: Date) {
    return new Date(d).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  function PlanRow({ plan }: { plan: (typeof plans)[number] }) {
    const isUpcoming = new Date(plan.date) >= now
    return (
      <Link
        href={`/app/plans/${plan.id}`}
        className="flex items-center gap-4 px-5 py-4 transition-all group hover:no-underline"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "var(--radius-xl)",
        }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          <CalendarDays size={18} style={{ color: "var(--color-primary)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold capitalize truncate" style={{ color: "var(--color-on-surface)" }}>
            {plan.title ?? formatDate(plan.date)}
          </p>
          <p className="text-xs mt-0.5 capitalize" style={{ color: "var(--color-on-surface-variant)" }}>
            {plan.title ? formatDate(plan.date) : ""}{plan.title ? " · " : ""}{plan._count.items} élément{plan._count.items !== 1 ? "s" : ""}
          </p>
        </div>
        {isUpcoming && (
          <span className="badge badge-progress shrink-0">À venir</span>
        )}
        <ArrowRight size={16} className="shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: "var(--color-outline)" }} />
      </Link>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header flex items-start justify-between">
        <div>
          <p className="eyebrow"><CalendarDays size={12} /> Plans</p>
          <h1 className="page-title">Plans de service</h1>
          <p className="page-subtitle">{plans.length} plan{plans.length > 1 ? "s" : ""}</p>
        </div>
        {canManagePlans(session.user.role) && (
          <Link href="/app/plans/new" className="btn btn-primary btn-sm mt-1">
            <Plus size={15} strokeWidth={2.5} />
            Nouveau plan
          </Link>
        )}
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4" style={{ color: "var(--color-on-surface-variant)" }}>
          <CalendarDays size={40} strokeWidth={1} style={{ color: "var(--color-outline-variant)" }} />
          <p className="text-sm">Aucun plan de service pour l'instant.</p>
          {canManagePlans(session.user.role) && (
            <Link href="/app/plans/new" className="btn btn-primary btn-sm">
              <Plus size={14} /> Créer le premier plan
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-on-surface-variant)" }}>
                À venir
              </h2>
              <div className="flex flex-col gap-2">
                {upcoming.map((p) => <PlanRow key={p.id} plan={p} />)}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-on-surface-variant)" }}>
                Passés
              </h2>
              <div className="flex flex-col gap-2">
                {past.map((p) => <PlanRow key={p.id} plan={p} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
