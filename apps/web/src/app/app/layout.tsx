import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SideNav } from "@/components/layout/SideNav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      <SideNav user={session.user} />
      <main
        className="min-h-screen"
        style={{ marginLeft: "var(--sidebar-width)" }}
      >
        {children}
      </main>
    </div>
  )
}
