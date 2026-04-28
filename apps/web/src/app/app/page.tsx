import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Music2, CalendarDays, Heart, TrendingUp, Play, ArrowRight } from "lucide-react"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const userId = session.user.id

  const [songsCount, favoritesCount, learningStats, nextPlan] = await Promise.all([
    prisma.song.count({ where: { deletedAt: null } }),
    prisma.favorite.count({ where: { userId } }),
    prisma.songLearning.groupBy({
      by: ["status"],
      where: { userId },
      _count: { status: true },
    }),
    prisma.servicePlan.findFirst({
      where: { date: { gte: new Date() }, deletedAt: null },
      orderBy: { date: "asc" },
      include: {
        items: {
          where: { kind: "SONG_BLOCK" },
          orderBy: { order: "asc" },
          take: 5,
          include: { song: { select: { title: true } } },
        },
      },
    }),
  ])

  const mastered = learningStats.find((s) => s.status === "MASTERED")?._count.status ?? 0
  const inProgress = learningStats.find((s) => s.status === "IN_PROGRESS")?._count.status ?? 0
  const totalLearning = learningStats.reduce((acc, s) => acc + s._count.status, 0)
  const circumference = 2 * Math.PI * 26
  const masteredDash = totalLearning > 0 ? (mastered / totalLearning) * circumference : 0
  const progressDash = totalLearning > 0 ? (inProgress / totalLearning) * circumference : 0

  const favoriteSongs = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 4,
    include: { song: { select: { id: true, title: true, artist: true } } },
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  const firstName = session.user.name?.split(" ")[0] ?? "Chantre"

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <p className="eyebrow"><TrendingUp size={12} /> Dashboard</p>
        <h1 className="page-title">{greeting}, {firstName}</h1>
        <p className="page-subtitle">Voici votre aperçu de la semaine.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Chants",    value: songsCount,     icon: Music2,       href: "/app/songs",     accent: "var(--color-primary)" },
          { label: "Favoris",   value: favoritesCount, icon: Heart,        href: "/app/favorites", accent: "var(--color-tertiary)" },
          { label: "Maîtrisés", value: mastered,       icon: TrendingUp,   href: "/app/songs",     accent: "var(--color-mastered)" },
          { label: "En cours",  value: inProgress,     icon: CalendarDays, href: "/app/songs",     accent: "var(--color-progress)" },
        ].map(({ label, value, icon: Icon, href, accent }) => (
          <Link key={label} href={href} className="card flex flex-col gap-3 hover:no-underline">
            <div className="flex items-center justify-between">
              <p className="eyebrow" style={{ marginBottom: 0 }}>{label}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(255,255,255,0.07)` }}>
                <Icon size={15} style={{ color: accent }} />
              </div>
            </div>
            <p className="text-3xl font-extrabold" style={{ color: accent }}>{value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Prochain plan — 3 colonnes */}
        <div className="lg:col-span-3 card">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="eyebrow"><CalendarDays size={12} /> Prochain service</p>
              {nextPlan ? (
                <h2 className="text-xl font-bold" style={{ color: "var(--color-on-surface)" }}>
                  {nextPlan.title ?? new Date(nextPlan.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                </h2>
              ) : (
                <p style={{ color: "var(--color-on-surface-variant)", fontSize: "0.9rem" }}>Aucun plan à venir</p>
              )}
              {nextPlan && (
                <p className="text-sm mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
                  {new Date(nextPlan.date).toLocaleDateString("fr-FR", { month: "short", day: "numeric", year: "numeric" })}
                  {" · "}
                  {new Date(nextPlan.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
            {nextPlan && (
              <Link href={`/app/plans/${nextPlan.id}`} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
                <Play size={13} strokeWidth={2.5} />
                Worship Mode
              </Link>
            )}
          </div>

          {nextPlan?.items && nextPlan.items.length > 0 ? (
            <>
              <p className="eyebrow mb-3" style={{ color: "var(--color-on-surface-variant)" }}>SETLIST PREVIEW</p>
              <ul className="flex flex-col gap-1">
                {nextPlan.items.map((item, i) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <span
                      className="w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0"
                      style={{ background: "rgba(192,193,255,0.15)", color: "var(--color-primary)" }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-sm font-medium truncate" style={{ color: "var(--color-on-surface)" }}>
                      {item.title ?? item.song?.title}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : nextPlan ? (
            <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>Aucun chant dans ce plan.</p>
          ) : (
            <Link href="/app/plans/new" className="btn btn-secondary btn-sm mt-2">
              Créer un plan <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {/* Progression — 2 colonnes */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Donut */}
          <div className="card flex-1">
            <p className="eyebrow mb-4"><TrendingUp size={12} /> Learning Progress</p>
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
                  <circle
                    cx="32" cy="32" r="26" fill="none"
                    stroke="var(--color-mastered)"
                    strokeWidth="7"
                    strokeDasharray={`${masteredDash} ${circumference}`}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="32" cy="32" r="26" fill="none"
                    stroke="var(--color-progress)"
                    strokeWidth="7"
                    strokeDasharray={`${progressDash} ${circumference}`}
                    strokeDashoffset={-masteredDash}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-extrabold" style={{ color: "var(--color-on-surface)" }}>{mastered}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>Mastered</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "var(--color-mastered)" }} />
                  <div>
                    <p className="font-semibold" style={{ color: "var(--color-on-surface)" }}>{mastered} maîtrisés</p>
                    <div className="mt-1 h-1.5 w-24 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <div className="h-full rounded-full" style={{ width: totalLearning > 0 ? `${(mastered/totalLearning)*100}%` : "0%", background: "var(--color-mastered)" }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "var(--color-progress)" }} />
                  <div>
                    <p className="font-semibold" style={{ color: "var(--color-on-surface)" }}>{inProgress} en cours</p>
                    <div className="mt-1 h-1.5 w-24 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <div className="h-full rounded-full" style={{ width: totalLearning > 0 ? `${(inProgress/totalLearning)*100}%` : "0%", background: "var(--color-progress)" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Favoris rapides */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="eyebrow" style={{ marginBottom: 0 }}><Heart size={12} /> Favoris</p>
              <Link href="/app/favorites" className="text-xs font-semibold" style={{ color: "var(--color-primary)" }}>
                Voir tout
              </Link>
            </div>
            {favoriteSongs.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>Aucun favori pour l'instant.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {favoriteSongs.map(({ song }) => (
                  <Link
                    key={song.id}
                    href={`/app/songs/${song.id}`}
                    className="flex flex-col px-3 py-2 rounded-lg transition-colors"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <p className="text-sm font-medium truncate" style={{ color: "var(--color-on-surface)" }}>{song.title}</p>
                    {song.artist && <p className="text-xs truncate" style={{ color: "var(--color-on-surface-variant)" }}>{song.artist}</p>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
