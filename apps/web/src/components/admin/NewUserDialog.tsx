"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { toast } from "sonner"
import type { AppRole } from "@/lib/roles"

type User = {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
}

const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN:               "Administrateur",
  RESPONSABLE_CHANTRE: "Responsable Chantre",
  CHANTRE:             "Chantre",
  LECTEUR:             "Lecteur",
}

export function NewUserDialog({
  onClose,
  onCreated,
  allowedRoles,
}: {
  onClose: () => void
  onCreated: (user: User) => void
  allowedRoles: AppRole[]
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<AppRole>(allowedRoles[0] ?? "CHANTRE")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      })
      const json = await res.json()
      if (!json.ok) {
        toast.error(json.error ?? "Erreur lors de la création")
        return
      }
      onCreated(json.data)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
      <div className="card w-full max-w-md mx-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-outline-variant)" }}>
        <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: "1px solid var(--color-outline-variant)" }}>
          <h2 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>Nouvel utilisateur</h2>
          <button type="button" onClick={onClose} className="btn btn-ghost" style={{ padding: "4px" }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { label: "Nom complet", value: name, onChange: setName, type: "text", placeholder: "Jean Dupont" },
            { label: "Email", value: email, onChange: setEmail, type: "email", placeholder: "jean@exemple.com" },
            { label: "Mot de passe", value: password, onChange: setPassword, type: "password", placeholder: "Min. 8 caractères" },
          ].map(({ label, value, onChange, type, placeholder }) => (
            <div key={label}>
              <label className="input-label">{label}</label>
              <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                required
                minLength={type === "password" ? 8 : undefined}
                className="input"
              />
            </div>
          ))}

          <div>
            <label className="input-label">Rôle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AppRole)}
              className="input"
            >
              {allowedRoles.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
              {saving ? "Création…" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
