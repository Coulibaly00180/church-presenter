import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { canAccessUserAdmin } from "@/lib/roles"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname

  if (!isLoggedIn && pathname.startsWith("/app")) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  // Protection de la zone admin au niveau middleware
  if (isLoggedIn && pathname.startsWith("/app/admin")) {
    const role = (req.auth?.user as { role?: string } | undefined)?.role ?? ""
    if (!canAccessUserAdmin(role)) {
      return NextResponse.redirect(new URL("/app", req.nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/app/:path*"],
}
