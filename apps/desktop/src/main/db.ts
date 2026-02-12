import { PrismaClient } from "@prisma/client";

let prismaSingleton: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (prismaSingleton) return prismaSingleton;
  prismaSingleton = new PrismaClient();
  return prismaSingleton;
}
