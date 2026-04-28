import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    user: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  },
}))

vi.mock("@/lib/auth", () => ({ auth: mockAuth }))
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed_password") },
}))

import { GET, POST } from "./route"

function makeAdmin() {
  return { user: { id: "admin-1", name: "Admin", email: "admin@test.com", role: "ADMIN" } }
}
function makeChantre() {
  return { user: { id: "user-1", name: "User", email: "user@test.com", role: "CHANTRE" } }
}

const baseUser = {
  id: "user-1", name: "Jean Dupont", email: "jean@test.com",
  role: "CHANTRE", isActive: true, lastLoginAt: null, createdAt: new Date(),
}

describe("GET /api/users", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(makeAdmin())
    mockPrisma.user.findMany.mockResolvedValue([baseUser])
  })

  it("retourne 401 sans session", async () => {
    mockAuth.mockResolvedValue(null)
    expect((await GET(new Request("http://localhost"))).status).toBe(401)
  })

  it("retourne 403 si non admin", async () => {
    mockAuth.mockResolvedValue(makeChantre())
    expect((await GET(new Request("http://localhost"))).status).toBe(403)
  })

  it("retourne la liste pour un admin", async () => {
    const res = await GET(new Request("http://localhost"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data).toHaveLength(1)
  })

  it("n'expose pas passwordHash", async () => {
    await GET(new Request("http://localhost"))
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: expect.not.objectContaining({ passwordHash: true }) })
    )
  })
})

describe("POST /api/users", () => {
  const validPayload = { name: "Marie Martin", email: "marie@test.com", password: "motdepasse123", role: "CHANTRE" }

  function makeReq(body: unknown) {
    return new Request("http://localhost", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })
  }

  beforeEach(() => {
    mockAuth.mockResolvedValue(makeAdmin())
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({ ...baseUser, name: "Marie Martin" })
  })

  it("retourne 403 si non admin", async () => {
    mockAuth.mockResolvedValue(makeChantre())
    expect((await POST(makeReq(validPayload))).status).toBe(403)
  })

  it("retourne 400 si email invalide", async () => {
    expect((await POST(makeReq({ ...validPayload, email: "pas-un-email" }))).status).toBe(400)
  })

  it("retourne 409 si email déjà utilisé", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(baseUser)
    expect((await POST(makeReq(validPayload))).status).toBe(409)
  })

  it("crée l'utilisateur et retourne 201", async () => {
    const res = await POST(makeReq(validPayload))
    expect(res.status).toBe(201)
    expect(mockPrisma.user.create).toHaveBeenCalledOnce()
  })

  it("hache le mot de passe avant création", async () => {
    await POST(makeReq(validPayload))
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ passwordHash: "hashed_password" }) })
    )
  })
})
