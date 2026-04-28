"use client"

import { useState, useTransition } from "react"
import { Plus, Trash2, UserCheck, UserX } from "lucide-react"
import { toast } from "sonner"
import { NewUserDialog } from "./NewUserDialog"
import { canDeleteUser, canChangeUserRole, allowedRolesToAssign, type AppRole } from "@/lib/roles"

type User = {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  RESPONSABLE_CHANTRE: "Resp. Chantre",
  CHANTRE: "Chantre",
  LECTEUR: "Lecteur",
}

const ROLE_BADGE: Record<string, string> = {
  ADMIN:               "badge badge-progress",
  RESPONSABLE_CHANTRE: "badge badge-mastered",
  CHANTRE:             "badge",
  LECTEUR:             "badge",
}

type Filter = "ALL" | "ADMIN" | "RESPONSABLE_CHANTRE" | "CHANTRE" | "LECTEUR"

export function UserTableClient({
  users: initial,
  currentUserId,
  currentUserRole,
}: {
  users: User[]
  currentUserId: string
  currentUserRole: string
}) {
  const [users, setUsers] = useState(initial)
  const [filter, setFilter] = useState<Filter>("ALL")
  const [showNew, setShowNew] = useState(false)
  const [isPending, startTransition] = useTransition()

  const filtered = filter === "ALL" ? users : users.filter((u) => u.role === filter)

  const canDelete = canDeleteUser(currentUserRole)
  const canToggleActive = canChangeUserRole(currentUserRole)
  const creatableRoles = allowedRolesToAssign(currentUserRole)

  function handleCreated(user: User) {
    setUsers((prev) => [user, ...prev])
    setShowNew(false)
    toast.success(`Utilisateur ${user.name} créé`)
  }

  function toggleActive(user: User) {
    if (!canToggleActive) return
    startTransition(async () => {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: !user.isActive } : u)))
        toast.success(user.isActive ? "Utilisateur désactivé" : "Utilisateur activé")
      } else {
        toast.error("Erreur lors de la mise à jour")
      }
    })
  }

  function deleteUser(user: User) {
    if (!confirm(`Supprimer ${user.name} ? Cette action est irréversible.`)) return
    startTransition(async () => {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" })
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id))
        toast.success("Utilisateur supprimé")
      } else {
        toast.error("Erreur lors de la suppression")
      }
    })
  }

  const filters: { value: Filter; label: string }[] = [
    { value: "ALL", label: "Tous" },
    { value: "ADMIN", label: "Admin" },
    { value: "RESPONSABLE_CHANTRE", label: "Resp. Chantre" },
    { value: "CHANTRE", label: "Chantre" },
    { value: "LECTEUR", label: "Lecteur" },
  ]

  return (
    <div className="page-container">
      <div className="page-header flex items-start justify-between">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="page-title">Gestion des Utilisateurs</h1>
          <p className="page-subtitle">Gérez les accès et les rôles de votre équipe.</p>
        </div>
        {creatableRoles.length > 0 && (
          <button type="button" onClick={() => setShowNew(true)} className="btn btn-primary btn-sm mt-1">
            <Plus size={15} strokeWidth={2.5} />
            Nouvel utilisateur
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-full transition-colors"
            style={filter === value
              ? { background: "var(--color-primary-deep)", color: "#fff", border: "1px solid transparent" }
              : { background: "rgba(255,255,255,0.05)", color: "var(--color-on-surface-variant)", border: "1px solid var(--color-outline-variant)" }
            }
          >
            {label}
            <span className="ml-1.5 opacity-60">
              {value === "ALL" ? users.length : users.filter((u) => u.role === value).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card-flat overflow-hidden" style={{ padding: 0, borderRadius: "var(--radius-xl)" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Membre</th>
              <th>Contact</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => {
              const initials = user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
              const isSelf = user.id === currentUserId

              return (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                        style={{ background: "linear-gradient(135deg, var(--color-primary-deep), var(--color-primary-dim))", color: "#fff" }}
                      >
                        {initials}
                      </div>
                      <span className="font-medium" style={{ color: "var(--color-on-surface)" }}>{user.name}</span>
                      {isSelf && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)", color: "var(--color-on-surface-variant)" }}>
                          Vous
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: "var(--color-on-surface-variant)" }}>{user.email}</td>
                  <td>
                    <span className={ROLE_BADGE[user.role] ?? "badge"}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td>
                    <span
                      className="flex items-center gap-1.5 text-xs font-medium w-fit"
                      style={{ color: user.isActive ? "var(--color-mastered)" : "var(--color-on-surface-variant)" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: user.isActive ? "var(--color-mastered)" : "var(--color-outline)" }} />
                      {user.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1.5">
                      {canToggleActive && (
                        <button
                          type="button"
                          onClick={() => toggleActive(user)}
                          disabled={isPending || isSelf}
                          title={user.isActive ? "Désactiver" : "Activer"}
                          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-30"
                          style={{ border: "1px solid var(--color-outline-variant)", color: "var(--color-on-surface-variant)" }}
                        >
                          {user.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => deleteUser(user)}
                          disabled={isPending || isSelf}
                          title="Supprimer"
                          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-30"
                          style={{ border: "1px solid var(--color-outline-variant)", color: "var(--color-error)" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
                  Aucun utilisateur dans cette catégorie.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="px-5 py-3 text-xs" style={{ borderTop: "1px solid var(--color-outline-variant)", color: "var(--color-on-surface-variant)" }}>
          {filtered.length} / {users.length} utilisateur{users.length !== 1 ? "s" : ""}
        </div>
      </div>

      {showNew && (
        <NewUserDialog
          onClose={() => setShowNew(false)}
          onCreated={handleCreated}
          allowedRoles={creatableRoles}
        />
      )}
    </div>
  )
}
