"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard, Music2, CalendarDays, Users,
  Heart, LogOut, UserCircle, Plus,
} from "lucide-react"
import { canAccessUserAdmin, canManagePlans } from "@/lib/roles"

type NavUser = {
  name?: string | null
  email?: string | null
  role?: string
}

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
}

const ROLE_SUBTITLE: Record<string, string> = {
  ADMIN:               "Administrateur",
  RESPONSABLE_CHANTRE: "Responsable Chantre",
  CHANTRE:             "Chantre",
  LECTEUR:             "Lecteur",
}

function NavLink({ href, label, icon: Icon, exact }: NavItem) {
  const pathname = usePathname()
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/")

  return (
    <Link href={href} aria-current={active ? "page" : undefined} className="sidebar-nav-link">
      <Icon size={16} strokeWidth={active ? 2.5 : 1.75} />
      {label}
    </Link>
  )
}

export function SideNav({ user }: { user: NavUser }) {
  const role = user.role ?? ""
  const showAdmin = canAccessUserAdmin(role)
  const showNewSetlist = canManagePlans(role)

  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?"

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        WorshipFlow
        <span>Church Presenter</span>
      </div>

      {/* Profil */}
      <div className="sidebar-user">
        <div className="sidebar-avatar">{initials}</div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--color-on-surface)" }}>
            {user.name ?? "Utilisateur"}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--color-on-surface-variant)" }}>
            {ROLE_SUBTITLE[role] ?? role}
          </p>
        </div>
      </div>

      {/* Bouton New Setlist — visible pour les gestionnaires de plans */}
      {showNewSetlist && (
        <div className="px-3 pt-3 pb-1">
          <Link href="/app/plans/new" className="btn btn-primary w-full btn-sm" style={{ justifyContent: "center" }}>
            <Plus size={15} strokeWidth={2.5} />
            New Setlist
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav className="sidebar-nav">
        <NavLink href="/app" label="Tableau de Bord" icon={LayoutDashboard} exact />
        <NavLink href="/app/songs" label="Bibliothèque" icon={Music2} />
        <NavLink href="/app/plans" label="Plans" icon={CalendarDays} />
        <NavLink href="/app/favorites" label="Favoris" icon={Heart} />
        {showAdmin && (
          <NavLink href="/app/admin/users" label="Utilisateurs" icon={Users} />
        )}
        <NavLink href="/app/profile" label="Profil" icon={UserCircle} />
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="sidebar-nav-link"
          style={{ color: "var(--color-outline)" }}
        >
          <LogOut size={16} strokeWidth={1.75} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
