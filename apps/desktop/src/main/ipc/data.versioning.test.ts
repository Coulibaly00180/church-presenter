import { describe, expect, it } from "vitest";

import { migrateImportedDataPayload } from "./data";

describe("data JSON versioning", () => {
  it("accepts v2 export envelope", () => {
    const migrated = migrateImportedDataPayload({
      kind: "CHURCH_PRESENTER_EXPORT",
      schemaVersion: 2,
      payload: {
        songs: [{ title: "Song A" }],
        plans: [{ title: "Plan A" }],
      },
    });

    expect(Array.isArray(migrated.songs)).toBe(true);
    expect(Array.isArray(migrated.plans)).toBe(true);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.warnings).toEqual([]);
  });

  it("migrates legacy root schema", () => {
    const migrated = migrateImportedDataPayload({
      songs: [{ title: "Song A" }],
      plans: [{ title: "Plan A" }],
    });

    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.warnings.length).toBeGreaterThan(0);
  });

  it("rejects unknown future schema", () => {
    expect(() =>
      migrateImportedDataPayload({
        kind: "CHURCH_PRESENTER_EXPORT",
        schemaVersion: 99,
        payload: { songs: [], plans: [] },
      }),
    ).toThrow("Unsupported export schema version");
  });
});
