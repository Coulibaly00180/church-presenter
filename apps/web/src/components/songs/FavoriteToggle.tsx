"use client"

import { useState, useTransition } from "react"
import { Heart } from "lucide-react"
import { toast } from "sonner"

export function FavoriteToggle({ songId, initial }: { songId: string; initial: boolean }) {
  const [isFav, setIsFav] = useState(initial)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      const method = isFav ? "DELETE" : "POST"
      const res = await fetch(`/api/songs/${songId}/favorite`, { method })
      if (res.ok) {
        setIsFav(!isFav)
      } else {
        toast.error("Erreur lors de la mise à jour des favoris")
      }
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
      style={{ border: "1px solid var(--color-outline-variant)" }}
      title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <Heart
        size={16}
        style={isFav
          ? { fill: "var(--color-tertiary)", color: "var(--color-tertiary)" }
          : { color: "var(--color-on-surface-variant)" }
        }
      />
    </button>
  )
}
