import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ImportClient } from "@/components/songs/ImportClient"

export default async function ImportPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="page-container max-w-4xl">
      <Link
        href="/app/songs"
        className="inline-flex items-center gap-1.5 text-sm text-[--color-on-surface-variant] hover:text-[--color-on-surface] mb-6"
      >
        <ArrowLeft size={14} />
        Retour à la bibliothèque
      </Link>

      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-[--color-primary]">Importer des chants</h1>
        <p className="text-sm text-[--color-on-surface-variant] mt-1">
          Importez des fichiers pour parser automatiquement les titres et les blocs de paroles.
        </p>
      </div>

      <ImportClient />
    </div>
  )
}
