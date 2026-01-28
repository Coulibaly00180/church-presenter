import prismaPkg from "@prisma/client";
const { PrismaClient } = prismaPkg as any;

let prismaSingleton: any | null = null;

export function getPrisma() {
  if (prismaSingleton) return prismaSingleton;
  prismaSingleton = new PrismaClient();
  return prismaSingleton;
}
