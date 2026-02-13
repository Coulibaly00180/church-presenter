import { describe, expect, it } from "vitest";
import { validatePlanReorderPayload } from "./reorderValidation";

describe("validatePlanReorderPayload", () => {
  it("accepts a valid permutation", () => {
    expect(() => validatePlanReorderPayload(["a", "b", "c"], ["c", "a", "b"])).not.toThrow();
  });

  it("rejects payloads with invalid size", () => {
    expect(() => validatePlanReorderPayload(["a", "b"], ["a"])).toThrow("Invalid reorder payload size");
  });

  it("rejects payloads with duplicate ids", () => {
    expect(() => validatePlanReorderPayload(["a", "b"], ["a", "a"])).toThrow("Duplicate item id");
  });

  it("rejects ids outside the current plan", () => {
    expect(() => validatePlanReorderPayload(["a", "b"], ["a", "x"])).toThrow("outside target plan");
  });
});
