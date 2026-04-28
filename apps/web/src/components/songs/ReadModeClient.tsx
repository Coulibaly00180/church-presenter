"use client"

import { useState } from "react"
import Link from "next/link"
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"

type Block = { id: string; order: number; type: string; title: string | null; content: string }
type Song = { id: string; title: string; blocks: Block[] }

const blockTypeLabel: Record<string, string> = {
  VERSE: "Couplet",
  CHORUS: "Refrain",
  BRIDGE: "Bridge",
  INTRO: "Intro",
  OUTRO: "Outro",
  OTHER: "Autre",
}

export function ReadModeClient({ song }: { song: Song }) {
  const [current, setCurrent] = useState(0)
  const [fontSize, setFontSize] = useState(22)

  const block = song.blocks[current]
  const total = song.blocks.length

  function prev() { setCurrent((c) => Math.max(0, c - 1)) }
  function next() { setCurrent((c) => Math.min(total - 1, c + 1)) }

  return (
    <div className="fixed inset-0 bg-[#0d1117] flex flex-col text-white select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Link
          href={`/app/songs/${song.id}`}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <X size={18} />
        </Link>
        <span className="text-sm font-semibold tracking-wide">{song.title}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFontSize((f) => Math.max(14, f - 2))}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            title="Diminuer la taille"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-xs text-white/50 w-6 text-center">{fontSize}</span>
          <button
            type="button"
            onClick={() => setFontSize((f) => Math.min(40, f + 2))}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            title="Augmenter la taille"
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      {/* Current block — centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/40 mb-6">
          {blockTypeLabel[block?.type ?? ""] ?? block?.type ?? ""}
        </p>

        <p
          className="font-medium text-white leading-relaxed whitespace-pre-line max-w-2xl"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
        >
          {block?.content}
        </p>

        {/* Glimpse of next block */}
        {current + 1 < total && (
          <p
            className="mt-8 text-white/25 whitespace-pre-line max-w-2xl"
            style={{ fontSize: `${Math.max(12, fontSize - 6)}px`, lineHeight: 1.6 }}
          >
            {song.blocks[current + 1].content.split("\n").slice(0, 2).join("\n")}
          </p>
        )}
      </div>

      {/* Bottom bar */}
      <div className="px-6 py-4 border-t border-white/10">
        {/* Block pills */}
        <div className="flex items-center justify-center gap-1.5 mb-4 flex-wrap">
          {song.blocks.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setCurrent(i)}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                i === current
                  ? "bg-white text-[#0d1117]"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              {blockTypeLabel[b.type] ?? b.type}
            </button>
          ))}
        </div>

        {/* Progress + nav */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/40 w-10 text-right">{current + 1}/{total}</span>
          <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/50 rounded-full transition-all"
              style={{ width: `${((current + 1) / total) * 100}%` }}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={current === 0}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={current === total - 1}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-30 flex items-center justify-center transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
