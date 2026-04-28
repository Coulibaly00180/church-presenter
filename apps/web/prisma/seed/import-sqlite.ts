/**
 * Import SQLite (desktop) → PostgreSQL (web)
 *
 * Lancer depuis la racine du repo (sur la machine host, PAS dans Docker) :
 *   DATABASE_URL="postgresql://church:church@localhost:5432/church_presenter" \
 *     npx tsx apps/web/prisma/seed/import-sqlite.ts apps/desktop/data/app.db
 *
 * Sur Windows PowerShell :
 *   $env:DATABASE_URL="postgresql://church:church@localhost:5432/church_presenter"
 *   npx tsx apps/web/prisma/seed/import-sqlite.ts apps/desktop/data/app.db
 *
 * Nécessite better-sqlite3 (installé dans apps/desktop, résolu via node_modules racine).
 * Les enregistrements déjà présents (même id, titre ou date) sont ignorés silencieusement.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

const Database = require("better-sqlite3")
import { PrismaClient } from "@prisma/client"
import path from "path"
import fs from "fs"

const DB_PATH = path.resolve(
  process.argv[2] ?? path.join(__dirname, "../../../../desktop/data/app.db")
)

if (!fs.existsSync(DB_PATH)) {
  console.error(`❌ Fichier SQLite introuvable : ${DB_PATH}`)
  console.error("Usage: npx tsx apps/web/prisma/seed/import-sqlite.ts <chemin-vers-app.db>")
  process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
  console.log(`📂 SQLite : ${DB_PATH}`)
  console.log(`🐘 PostgreSQL : ${process.env["DATABASE_URL"]?.replace(/:[^:@]+@/, ":***@")}`)
  console.log()

  const db = new Database(DB_PATH, { readonly: true })

  const songs   = db.prepare("SELECT * FROM Song WHERE deletedAt IS NULL").all()
  const blocks  = db.prepare("SELECT * FROM SongBlock").all()
  const plans   = db.prepare("SELECT * FROM ServicePlan WHERE deletedAt IS NULL").all()
  const items   = db.prepare("SELECT * FROM ServiceItem").all()
  db.close()

  console.log(`Trouvé : ${songs.length} chants · ${blocks.length} blocs · ${plans.length} plans · ${items.length} items\n`)

  // Map sqlite song id → pg song id (pour les cas de doublon fusionné par titre)
  const songIdMap = new Map<string, string>()

  // ── Songs ────────────────────────────────────────────────────────────────
  let songsCreated = 0, songsSkipped = 0

  for (const _song of songs) {
    const s = _song as {
      id: string; title: string; artist?: string | null; album?: string | null
      year?: string | null; language?: string | null; tags?: string | null
      deletedAt?: string | null; createdAt: string; updatedAt: string
    }

    // Skip si id déjà présent
    const byId = await prisma.song.findUnique({ where: { id: s.id } })
    if (byId) { songIdMap.set(s.id, s.id); songsSkipped++; continue }

    // Skip si titre déjà présent (contrainte @unique du schéma web)
    const byTitle = await prisma.song.findUnique({ where: { title: s.title } })
    if (byTitle) {
      console.warn(`  ⚠ Skip (titre existant) : "${s.title}" → mappé vers ${byTitle.id}`)
      songIdMap.set(s.id, byTitle.id)
      songsSkipped++; continue
    }

    const songBlocks = (blocks as { songId: string; id: string; order: number; type: string; title?: string | null; content: string; createdAt: string; updatedAt: string }[])
      .filter((b) => b.songId === s.id)

    await prisma.song.create({
      data: {
        id: s.id,
        title: s.title,
        artist: s.artist ?? null,
        album: s.album ?? null,
        year: s.year ?? null,
        language: s.language ?? null,
        tags: s.tags ?? null,
        deletedAt: s.deletedAt ? new Date(s.deletedAt) : null,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
        blocks: {
          create: songBlocks.map((b) => ({
            id: b.id,
            order: b.order,
            type: b.type,
            title: b.title ?? null,
            content: b.content,
            createdAt: new Date(b.createdAt),
            updatedAt: new Date(b.updatedAt),
          })),
        },
      },
    })
    songIdMap.set(s.id, s.id)
    songsCreated++
    process.stdout.write(`  ✓ ${s.title}\n`)
  }

  console.log(`\nChants : ${songsCreated} créés, ${songsSkipped} ignorés`)

  // ── Plans ────────────────────────────────────────────────────────────────
  let plansCreated = 0, plansSkipped = 0

  for (const _plan of plans) {
    const p = _plan as {
      id: string; date: string; title?: string | null; backgroundConfig?: string | null
      deletedAt?: string | null; createdAt: string; updatedAt: string
    }

    const byId = await prisma.servicePlan.findUnique({ where: { id: p.id } })
    if (byId) { plansSkipped++; continue }

    const planDate = new Date(p.date)
    const byDate = await prisma.servicePlan.findUnique({ where: { date: planDate } })
    if (byDate) {
      console.warn(`  ⚠ Skip (date existante) : ${p.date} — ${p.title ?? ""}`)
      plansSkipped++; continue
    }

    const planItems = (items as {
      id: string; planId: string; order: number; kind: string
      refId?: string | null; refSubId?: string | null; songId?: string | null
      title?: string | null; content?: string | null; notes?: string | null
      mediaPath?: string | null; secondaryContent?: string | null
      backgroundConfig?: string | null; createdAt: string; updatedAt: string
    }[]).filter((it) => it.planId === p.id)

    await prisma.servicePlan.create({
      data: {
        id: p.id,
        date: planDate,
        title: p.title ?? null,
        backgroundConfig: p.backgroundConfig ?? null,
        deletedAt: p.deletedAt ? new Date(p.deletedAt) : null,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
        items: {
          create: planItems.map((it) => ({
            id: it.id,
            order: it.order,
            kind: it.kind,
            refId: it.refId ?? null,
            refSubId: it.refSubId ?? null,
            songId: it.songId ? (songIdMap.get(it.songId) ?? null) : null,
            title: it.title ?? null,
            content: it.content ?? null,
            notes: it.notes ?? null,
            mediaPath: it.mediaPath ?? null,
            secondaryContent: it.secondaryContent ?? null,
            backgroundConfig: it.backgroundConfig ?? null,
            createdAt: new Date(it.createdAt),
            updatedAt: new Date(it.updatedAt),
          })),
        },
      },
    })
    plansCreated++
    process.stdout.write(`  ✓ ${p.title ?? p.date}\n`)
  }

  console.log(`\nPlans : ${plansCreated} créés, ${plansSkipped} ignorés`)
  console.log("\n✅ Import terminé")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
