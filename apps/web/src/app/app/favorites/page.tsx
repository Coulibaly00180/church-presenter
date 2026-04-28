import Link from "next/link"
import { Heart, Search } from "lucide-react"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { FavoriteToggle } from "@/components/songs/FavoriteToggle"
import { LearningBadge } from "@/components/songs/LearningBadge"

type Props = {
  searchParams: Promise<{ q?: string; sort?: string }>
}

function parseTags(tags: string | null): string[] {
  if (!tags) return []
  try {
    const arr = JSON.parse(tags)
    return Array.isArray(arr) ? arr.map(String) : []
  } catch {
    return []
  }
}

export default async function FavoritesPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { q = "", sort = "recent" } = await searchParams

  const favorites = await prisma.favorite.findMany({
    where: {
      userId: session.user.id,
      song: {
        deletedAt: null,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { artist: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    },
    orderBy: sort === "title" ? { song: { title: "asc" } } : { createdAt: "desc" },
    include: {
      song: {
        include: {
          learnings: { where: { userId: session.user.id }, select: { status: true } },
        },
      },
    },
  })

  return (
    <div className="page-container">
      <div className="page-header">
        <p className="eyebrow"><Heart size={12} /> Favoris</p>
        <h1 className="page-title">Mes Chants Favoris</h1>
        <p className="page-subtitle">{favorites.length} chant{favorites.length > 1 ? "s" : ""} en favoris</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-8">
        <form method="GET" className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-outline)" }} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Rechercher dans les favoris…"
            className="input"
            style={{ paddingLeft: "36px", borderRadius: "var(--radius-full)" }}
          />
        </form>

        <div className="flex items-center gap-1 overflow-hidden" style={{ border: "1px solid var(--color-outline-variant)", borderRadius: "var(--radius-md)" }}>
          {[
            { value: "recent", label: "Récent" },
            { value: "title", label: "A→Z" },
          ].map(({ value, label }) => (
            <Link
              key={value}
              href={`/app/favorites?sort=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className="px-3 py-1.5 text-xs font-semibold transition-colors"
              style={sort === value
                ? { background: "var(--color-primary-deep)", color: "#fff" }
                : { color: "var(--color-on-surface-variant)" }
              }
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Grid */}
      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4" style={{ color: "var(--color-on-surface-variant)" }}>
          <Heart size={40} strokeWidth={1} style={{ color: "var(--color-outline-variant)" }} />
          <p className="text-sm">
            {q ? "Aucun favori ne correspond à votre recherche." : "Vous n'avez pas encore de chant favori."}
          </p>
          {!q && (
            <Link href="/app/songs" className="btn btn-secondary btn-sm">
              Parcourir la bibliothèque →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {favorites.map(({ song }) => {
            const tags = parseTags(song.tags)
            const learning = song.learnings[0]?.status ?? null

            return (
              <div key={song.id} className="song-card group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {tags.slice(0, 2).map((t) => (
                          <span key={t} className="key-badge">{t}</span>
                        ))}
                      </div>
                    )}
                    <h3 className="song-card-title line-clamp-2">{song.title}</h3>
                    {song.artist && (
                      <p className="song-card-artist mt-0.5 truncate">{song.artist}</p>
                    )}
                  </div>
                  <FavoriteToggle songId={song.id} initial={true} />
                </div>

                <div className="flex items-center justify-between mt-1">
                  <LearningBadge status={learning} />
                  <Link
                    href={`/app/songs/${song.id}`}
                    className="flex items-center gap-1 text-xs font-semibold shrink-0 transition-colors"
                    style={{ color: "var(--color-primary)" }}
                  >
                    Voir →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
