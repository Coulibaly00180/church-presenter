import type { Metadata } from "next"
import { Manrope } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Toaster } from "sonner"

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Church Presenter — Chantres",
  description: "Application de gestion des chants pour les chantres",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={manrope.className} suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  )
}
