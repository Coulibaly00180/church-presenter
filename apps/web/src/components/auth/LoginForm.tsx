"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AtSign, Lock, ArrowRight, Loader2 } from "lucide-react"

export function LoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await signIn("credentials", { email: login, password, redirect: false })
      if (result?.error) {
        toast.error("Email ou mot de passe incorrect")
        return
      }
      router.push("/app/songs")
      router.refresh()
    } catch {
      toast.error("Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card flex flex-col gap-5"
      style={{ padding: "28px" }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login" className="input-label">Email ou pseudo</label>
        <div className="relative">
          <AtSign
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-outline)" }}
          />
          <input
            id="login"
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
            autoComplete="username"
            className="input"
            style={{ paddingLeft: "38px" }}
            placeholder="vous@exemple.com ou mon_pseudo"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="input-label">Mot de passe</label>
        <div className="relative">
          <Lock
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-outline)" }}
          />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="input"
            style={{ paddingLeft: "38px" }}
            placeholder="••••••••"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary w-full"
        style={{ marginTop: "4px" }}
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> Connexion…</>
        ) : (
          <>Se connecter <ArrowRight size={16} /></>
        )}
      </button>
    </form>
  )
}
