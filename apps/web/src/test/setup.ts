import { vi } from "vitest"

// Silence next/navigation in unit tests
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// Silence next-auth in unit tests
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
  signIn: vi.fn(),
  useSession: () => ({ data: null, status: "unauthenticated" }),
}))
