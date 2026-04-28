import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname

  if (!isLoggedIn && pathname.startsWith("/app")) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  // La vérification fine du rôle admin se fait côté serveur dans les pages /app/admin/*
  // (le middleware Edge ne peut pas importer canAccessUserAdmin sans alourdir le bundle)

  return NextResponse.next()
})

export const config = {
  matcher: ["/app/:path*"],
}
