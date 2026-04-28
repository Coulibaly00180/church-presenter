import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SongForm } from "@/components/songs/SongForm"

export default async function NewSongPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="page-container">
      <Link
        href="/app/songs"
        className="inline-flex items-center gap-1.5 text-sm text-[--color-on-surface-variant] hover:text-[--color-on-surface] mb-6"
      >
        <ArrowLeft size={14} />
        Retour à la bibliothèque
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold text-[--color-primary]">Ajouter un chant</h1>
          <p className="text-sm text-[--color-on-surface-variant] mt-1">
            Enrichissez votre bibliothèque avec un nouveau cantique ou chant de louange.
          </p>
        </div>
      </div>

      <SongForm />
    </div>
  )
}
