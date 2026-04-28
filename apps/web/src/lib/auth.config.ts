import type { NextAuthConfig } from "next-auth"

// Config légère utilisée uniquement par le middleware Edge.
// Pas d'imports Prisma ni bcryptjs — ceux-ci ne sont pas compatibles Edge.
export const authConfig: NextAuthConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user
      const pathname = request.nextUrl.pathname

      if (pathname.startsWith("/app")) {
        return isLoggedIn
      }
      return true
    },
  },
}
