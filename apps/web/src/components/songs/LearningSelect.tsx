"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

type Status = "TO_LEARN" | "IN_PROGRESS" | "MASTERED" | null

const options: { value: NonNullable<Status>; label: string }[] = [
  { value: "TO_LEARN", label: "À apprendre" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "MASTERED", label: "Maîtrisé" },
]

const activeStyles: Record<NonNullable<Status>, React.CSSProperties> = {
  MASTERED:    { background: "var(--color-mastered-bg)",  color: "var(--color-mastered)",  border: "1px solid rgba(68,226,205,0.3)" },
  IN_PROGRESS: { background: "var(--color-progress-bg)", color: "var(--color-progress)", border: "1px solid rgba(255,178,185,0.3)" },
  TO_LEARN:    { background: "rgba(255,255,255,0.07)",    color: "var(--color-on-surface)", border: "1px solid var(--color-outline-variant)" },
}

export function LearningSelect({ songId, initial }: { songId: string; initial: Status }) {
  const [status, setStatus] = useState<Status>(initial)
  const [isPending, startTransition] = useTransition()

  function handleChange(value: NonNullable<Status>) {
    startTransition(async () => {
      const res = await fetch(`/api/songs/${songId}/learning`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      })
      if (res.ok) {
        setStatus(value)
        toast.success("Statut d'apprentissage mis à jour")
      } else {
        toast.error("Erreur lors de la mise à jour")
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="input-label" style={{ marginBottom: 0 }}>Apprentissage</span>
      <div className="flex gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={isPending}
            onClick={() => handleChange(opt.value)}
            className="px-3 py-1 text-xs font-semibold rounded-full transition-colors disabled:opacity-50"
            style={status === opt.value
              ? activeStyles[opt.value]
              : { background: "transparent", color: "var(--color-on-surface-variant)", border: "1px solid var(--color-outline-variant)" }
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
