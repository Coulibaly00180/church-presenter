import Link from "next/link"
import { Plus, Search, Upload, Music2 } from "lucide-react"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { SongCard } from "@/components/songs/SongCard"
import { canEditSongs, canImportSongs } from "@/lib/roles"

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

type Props = {
  searchParams: Promise<{ q?: string; letter?: string }>
}

export default async function SongsPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { q = "", letter = "" } = await searchParams
  const canEdit = canEditSongs(session.user.role)
  const canImport = canImportSongs(session.user.role)

  const songs = await prisma.song.findMany({
    where: {
      deletedAt: null,
      ...(q
        ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { artist: { contains: q, mode: "insensitive" } }] }
        : letter
          ? { title: { startsWith: letter, mode: "insensitive" } }
          : {}),
    },
    include: {
      favorites: { where: { userId: session.user.id }, select: { userId: true } },
      learnings: { where: { userId: session.user.id }, select: { status: true } },
    },
    orderBy: { title: "asc" },
  })

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header flex items-start justify-between">
        <div>
          <p className="eyebrow"><Music2 size={12} /> Library</p>
          <h1 className="page-title">Bibliothèque de Chants</h1>
          <p className="page-subtitle">{songs.length} chant{songs.length > 1 ? "s" : ""} dans la bibliothèque</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {canImport && (
            <Link href="/app/songs/import" className="btn btn-secondary btn-sm">
              <Upload size={14} /> Importer
            </Link>
          )}
          {canEdit && (
            <Link href="/app/songs/new" className="btn btn-primary btn-sm">
              <Plus size={15} strokeWidth={2.5} /> Nouveau chant
            </Link>
          )}
        </div>
      </div>

      {/* Search */}
      <form method="GET" className="mb-5">
        <div className="relative" style={{ maxWidth: "480px" }}>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-outline)" }} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by title, author or lyrics..."
            className="input"
            style={{ paddingLeft: "40px", borderRadius: "var(--radius-full)" }}
          />
        </div>
      </form>

      {/* Alphabet filter */}
      <div className="flex flex-wrap gap-0.5 mb-7">
        <Link href="/app/songs" className="alpha-btn" data-active={(!letter && !q) ? "true" : "false"}>All</Link>
        {ALPHABET.map((l) => (
          <Link key={l} href={`/app/songs?letter=${l}`} className="alpha-btn" data-active={letter === l ? "true" : "false"}>
            {l}
          </Link>
        ))}
      </div>

      {/* Grid */}
      {songs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4" style={{ color: "var(--color-on-surface-variant)" }}>
          <Music2 size={40} strokeWidth={1} style={{ color: "var(--color-outline-variant)" }} />
          <p className="text-sm">Aucun chant trouvé.</p>
          {!q && !letter && (
            <Link href="/app/songs/new" className="btn btn-primary btn-sm">
              <Plus size={14} /> Ajouter le premier chant
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {songs.map((song) => (
            <SongCard
              key={song.id}
              id={song.id}
              title={song.title}
              artist={song.artist}
              tags={song.tags}
              isFavorite={song.favorites.length > 0}
              learningStatus={song.learnings[0]?.status ?? null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
