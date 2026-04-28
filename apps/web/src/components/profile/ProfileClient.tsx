"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Heart, TrendingUp, User } from "lucide-react"

type ProfileUser = {
  id: string
  name: string
  email: string
  role: string
  createdAt: Date
  lastLoginAt: Date | null
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  CHANTRE: "Chantre",
  LECTEUR: "Lecteur",
}

export function ProfileClient({
  user,
  favCount,
  masteredCount,
}: {
  user: ProfileUser
  favCount: number
  masteredCount: number
}) {
  const [name, setName] = useState(user.name)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingInfo, setSavingInfo] = useState(false)
  const [isPendingPwd, startSavingPwd] = useTransition()

  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault()
    setSavingInfo(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const json = await res.json()
      if (json.ok) toast.success("Profil mis à jour")
      else toast.error(json.error ?? "Erreur")
    } finally {
      setSavingInfo(false)
    }
  }

  function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas")
      return
    }
    startSavingPwd(async () => {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      })
      const json = await res.json()
      if (json.ok) {
        toast.success("Mot de passe mis à jour")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        toast.error(json.error ?? "Erreur")
      }
    })
  }

  return (
    <div className="page-container max-w-3xl">
      <p className="eyebrow">Mon Espace</p>
      <h1 className="page-title mb-8">Profil Utilisateur</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — avatar + stats */}
        <div className="flex flex-col gap-4">
          <div className="card flex flex-col items-center text-center">
            <div
              className="w-20 h-20 rounded-full text-2xl font-bold flex items-center justify-center mb-3"
              style={{ background: "linear-gradient(135deg, var(--color-primary-deep), var(--color-primary-dim))", color: "#fff" }}
            >
              {initials}
            </div>
            <p className="font-bold" style={{ color: "var(--color-primary)" }}>{name}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>{user.email}</p>
            <span
              className="mt-2 px-2.5 py-1 text-xs font-semibold rounded-full"
              style={{ background: "rgba(255,255,255,0.07)", color: "var(--color-on-surface-variant)" }}
            >
              {ROLE_LABELS[user.role]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="card text-center" style={{ padding: "16px" }}>
              <Heart size={16} className="mx-auto mb-1" style={{ color: "var(--color-tertiary)" }} />
              <p className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>{favCount}</p>
              <p className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>Favoris</p>
            </div>
            <div className="card text-center" style={{ padding: "16px" }}>
              <TrendingUp size={16} className="mx-auto mb-1" style={{ color: "var(--color-mastered)" }} />
              <p className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>{masteredCount}</p>
              <p className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>Maîtrisés</p>
            </div>
          </div>

          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--color-on-surface-variant)" }}>
              Paramètres
            </p>
            <div className="flex flex-col gap-3">
              {[
                { label: "Notifications push", desc: "Alertes de service" },
                { label: "Répétitions fréquentes", desc: "Rappels répétition" },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--color-on-surface)" }}>{label}</p>
                    <p className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>{desc}</p>
                  </div>
                  <button
                    type="button"
                    className="w-9 h-5 rounded-full relative transition-colors"
                    style={{ background: "var(--color-surface-high)" }}
                    aria-label={label}
                  >
                    <span
                      className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full shadow-sm transition-transform"
                      style={{ background: "var(--color-outline)" }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — forms */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <form onSubmit={saveInfo} className="card">
            <h2 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: "var(--color-primary)" }}>
              <User size={15} />
              Informations personnelles
            </h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="input-label">Nom complet</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="input-label">Email</label>
                <input
                  value={user.email}
                  disabled
                  className="input"
                  style={{ opacity: 0.5, cursor: "not-allowed" }}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button type="submit" disabled={savingInfo} className="btn btn-primary btn-sm">
                {savingInfo ? "Sauvegarde…" : "Enregistrer"}
              </button>
            </div>
          </form>

          <form onSubmit={savePassword} className="card">
            <h2 className="text-sm font-bold mb-4" style={{ color: "var(--color-primary)" }}>Sécurité</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="input-label">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                  required
                  className="input"
                />
              </div>
              <div className="col-span-2">
                <label className="input-label">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button type="submit" disabled={isPendingPwd} className="btn btn-primary btn-sm">
                {isPendingPwd ? "Mise à jour…" : "Mettre à jour le mot de passe"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
