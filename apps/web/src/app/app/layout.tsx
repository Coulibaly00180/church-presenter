import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SideNav, MobileNav } from "@/components/layout/SideNav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      {/* Sidebar desktop */}
      <SideNav user={session.user} />

      {/* Topbar + drawer mobile */}
      <MobileNav user={session.user} />

      {/* Contenu principal */}
      <main
        className="min-h-screen lg:ml-[var(--sidebar-width)]"
      >
        {children}
      </main>
    </div>
  )
}
