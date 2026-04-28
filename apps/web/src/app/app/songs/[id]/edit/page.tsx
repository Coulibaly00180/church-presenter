import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { SongForm } from "@/components/songs/SongForm"

type Props = { params: Promise<{ id: string }> }

export default async function EditSongPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params

  const song = await prisma.song.findUnique({
    where: { id },
    include: { blocks: { orderBy: { order: "asc" } } },
  })

  if (!song || song.deletedAt) notFound()

  return (
    <div className="page-container">
      <Link
        href={`/app/songs/${song.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-[--color-on-surface-variant] hover:text-[--color-on-surface] mb-6"
      >
        <ArrowLeft size={14} />
        Retour au chant
      </Link>

      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-[--color-primary]">Modifier le chant</h1>
        <p className="text-sm text-[--color-on-surface-variant] mt-1">{song.title}</p>
      </div>

      <SongForm initial={song} />
    </div>
  )
}
