import { vi } from "vitest"

// Minimal Prisma mock — extend per test as needed
export function createMockPrisma() {
  return {
    song: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    songBlock: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    servicePlan: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    serviceItem: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    favorite: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    songLearning: {
      upsert: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({})),
  }
}

export type MockPrisma = ReturnType<typeof createMockPrisma>
