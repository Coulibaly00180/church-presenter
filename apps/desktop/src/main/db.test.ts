import { describe, expect, it, vi } from "vitest";
import { applySingleMigration } from "./db";

function createMockPrisma(options?: { failOnStatement?: string }) {
  const calls: string[] = [];

  return {
    calls,
    prisma: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      $executeRawUnsafe: vi.fn(async (sql: string, ...args: unknown[]) => {
        calls.push(sql.trim().slice(0, 80));
        if (options?.failOnStatement && sql.includes(options.failOnStatement)) {
          throw new Error(`migration error: ${options.failOnStatement}`);
        }
      }),
    } as never,
  };
}

describe("applySingleMigration", () => {
  it("wraps statements in BEGIN/COMMIT on success", async () => {
    const { prisma, calls } = createMockPrisma();
    const sql = "CREATE TABLE foo (id TEXT);\nCREATE TABLE bar (id TEXT);";

    await applySingleMigration(prisma, "test_migration", sql);

    expect(calls).toContain("BEGIN");
    expect(calls).toContain("COMMIT");
    expect(calls).not.toContain("ROLLBACK");

    const finishCall = calls.find((c) => c.includes("finished_at"));
    expect(finishCall).toBeTruthy();
  });

  it("rolls back on non-benign error and marks rolled_back_at", async () => {
    const { prisma, calls } = createMockPrisma({ failOnStatement: "CREATE TABLE bar" });
    const sql = "CREATE TABLE foo (id TEXT);\nCREATE TABLE bar (id TEXT);";

    await expect(applySingleMigration(prisma, "fail_migration", sql)).rejects.toThrow("migration error");

    expect(calls).toContain("BEGIN");
    expect(calls).toContain("ROLLBACK");
    expect(calls).not.toContain("COMMIT");

    const rollbackCall = calls.find((c) => c.includes("rolled_back_at"));
    expect(rollbackCall).toBeTruthy();

    const finishCall = calls.find((c) => c.includes("SET \"finished_at\""));
    expect(finishCall).toBeFalsy();
  });

  it("treats 'already exists' errors as benign and continues", async () => {
    const calls: string[] = [];
    const prisma = {
      $executeRawUnsafe: vi.fn(async (sql: string) => {
        calls.push(sql.trim().slice(0, 80));
        if (sql.includes("CREATE TABLE foo")) {
          throw new Error("table foo already exists");
        }
      }),
    } as never;

    await applySingleMigration(prisma, "benign_migration", "CREATE TABLE foo (id TEXT);\nCREATE TABLE bar (id TEXT);");

    expect(calls).toContain("BEGIN");
    expect(calls).toContain("COMMIT");
    expect(calls).not.toContain("ROLLBACK");
  });

  it("records migration id in _prisma_migrations before executing", async () => {
    const { prisma, calls } = createMockPrisma();

    await applySingleMigration(prisma, "record_test", "SELECT 1;");

    const insertCall = calls.find((c) => c.includes("INSERT INTO"));
    expect(insertCall).toBeTruthy();

    const beginIdx = calls.indexOf("BEGIN");
    const insertIdx = calls.findIndex((c) => c.includes("INSERT INTO"));
    expect(insertIdx).toBeLessThan(beginIdx);
  });
});
