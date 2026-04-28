"use client"

import Link from "next/link"
import { Heart, ArrowRight } from "lucide-react"
import { LearningBadge } from "./LearningBadge"

type SongCardProps = {
  id: string
  title: string
  artist?: string | null
  tags?: string | null
  isFavorite?: boolean
  learningStatus?: "TO_LEARN" | "IN_PROGRESS" | "MASTERED" | null
}

function firstTag(tags?: string | null): string | null {
  if (!tags) return null
  try {
    const arr = JSON.parse(tags)
    return Array.isArray(arr) && arr.length > 0 ? String(arr[0]) : null
  } catch { return null }
}

export function SongCard({ id, title, artist, tags, isFavorite, learningStatus }: SongCardProps) {
  const tag = firstTag(tags)

  return (
    <div className="song-card group">
      {/* Ligne du haut */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="song-card-title line-clamp-2">{title}</h3>
          {artist && <p className="song-card-artist mt-0.5 truncate">{artist}</p>}
        </div>
        {isFavorite && (
          <Heart size={15} className="shrink-0 mt-0.5" style={{ color: "var(--color-tertiary)", fill: "var(--color-tertiary)" }} />
        )}
      </div>

      {/* Badges + CTA */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {tag && <span className="key-badge">{tag}</span>}
          <LearningBadge status={learningStatus ?? null} />
        </div>

        <Link
          href={`/app/songs/${id}`}
          className="flex items-center gap-1 text-xs font-semibold shrink-0 transition-colors"
          style={{ color: "var(--color-primary)" }}
          aria-label={`Voir ${title}`}
        >
          View <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}
