import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = process.env["ADMIN_EMAIL"]
  const password = process.env["ADMIN_PASSWORD"]

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL et ADMIN_PASSWORD sont requis")
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`Utilisateur ADMIN déjà existant : ${email}`)
    return
  }

  const passwordHash = await hash(password, 12)
  const admin = await prisma.user.create({
    data: {
      name: "Administrateur",
      email,
      passwordHash,
      role: "ADMIN",
    },
  })

  console.log(`✓ Admin créé : ${admin.email} (id: ${admin.id})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
