import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseSongText, parseDocx } from "@/lib/songParser"

// Parse-only endpoint: returns detected songs without saving
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 })

  const formData = await req.formData()
  const files = formData.getAll("files") as File[]

  if (!files.length) {
    return NextResponse.json({ ok: false, error: "Aucun fichier fourni" }, { status: 400 })
  }

  const results = await Promise.all(
    files.map(async (file) => {
      try {
        let text: string
        if (file.name.endsWith(".docx")) {
          const buffer = await file.arrayBuffer()
          text = await parseDocx(buffer)
        } else {
          text = await file.text()
        }

        const song = parseSongText(text)
        if (!song) return { file: file.name, ok: false, error: "Impossible de parser le fichier" }

        const existing = await prisma.song.findFirst({
          where: { title: song.title, deletedAt: null },
        })

        return {
          file: file.name,
          ok: true,
          song,
          exists: !!existing,
          existingId: existing?.id ?? null,
        }
      } catch (err) {
        return { file: file.name, ok: false, error: String(err) }
      }
    })
  )

  return NextResponse.json({ ok: true, data: results })
}
