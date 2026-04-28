import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/auth", () => ({ auth: mockAuth }))
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed_password") },
  hash: vi.fn().mockResolvedValue("hashed_password"),
}))

import { GET, POST } from "./route"

function makeAdmin() {
  return { user: { id: "admin-1", firstName: "Admin", lastName: "", username: "admin", name: "Admin", email: "admin@test.com", role: "ADMIN" } }
}
function makeChantre() {
  return { user: { id: "user-1", firstName: "Jean", lastName: "Dupont", username: "jean_dupont", name: "Jean Dupont", email: "user@test.com", role: "CHANTRE" } }
}

const baseUser = {
  id: "user-1",
  firstName: "Jean", lastName: "Dupont", username: "jean_dupont",
  name: "Jean Dupont", email: "jean@test.com",
  role: "CHANTRE", isActive: true, lastLoginAt: null, createdAt: new Date(),
}

describe("GET /api/users", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(makeAdmin())
    mockPrisma.user.findMany.mockResolvedValue([baseUser])
  })

  it("retourne 401 sans session", async () => {
    mockAuth.mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
  })

  it("retourne 403 si non admin/responsable", async () => {
    mockAuth.mockResolvedValue(makeChantre())
    expect((await GET()).status).toBe(403)
  })

  it("retourne la liste pour un admin", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data).toHaveLength(1)
  })

  it("n'expose pas passwordHash", async () => {
    await GET()
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: expect.not.objectContaining({ passwordHash: true }) })
    )
  })
})

describe("POST /api/users", () => {
  const validPayload = {
    firstName: "Marie", lastName: "Martin", username: "marie_martin",
    email: "marie@test.com", password: "motdepasse123", role: "CHANTRE",
  }

  function makeReq(body: unknown) {
    return new Request("http://localhost", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })
  }

  beforeEach(() => {
    mockAuth.mockResolvedValue(makeAdmin())
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({ ...baseUser, firstName: "Marie", lastName: "Martin", username: "marie_martin", name: "Marie Martin" })
  })

  it("retourne 403 si CHANTRE tente de créer un utilisateur", async () => {
    mockAuth.mockResolvedValue(makeChantre())
    expect((await POST(makeReq(validPayload))).status).toBe(403)
  })

  it("retourne 400 si email invalide", async () => {
    expect((await POST(makeReq({ ...validPayload, email: "pas-un-email" }))).status).toBe(400)
  })

  it("retourne 400 si prénom manquant", async () => {
    expect((await POST(makeReq({ ...validPayload, firstName: "" }))).status).toBe(400)
  })

  it("retourne 400 si pseudo trop court", async () => {
    expect((await POST(makeReq({ ...validPayload, username: "ab" }))).status).toBe(400)
  })

  it("retourne 409 si email déjà utilisé", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser).mockResolvedValueOnce(null)
    expect((await POST(makeReq(validPayload))).status).toBe(409)
  })

  it("retourne 403 si RESPONSABLE_CHANTRE tente d'attribuer ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "rc-1", role: "RESPONSABLE_CHANTRE" } })
    expect((await POST(makeReq({ ...validPayload, role: "ADMIN" }))).status).toBe(403)
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

  it("stocke firstName, lastName, username et name", async () => {
    await POST(makeReq(validPayload))
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "Marie",
          lastName: "Martin",
          username: "marie_martin",
          name: "Marie Martin",
        }),
      })
    )
  })
})
