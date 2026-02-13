export function validatePlanReorderPayload(currentIds: string[], requestedIds: string[]) {
  if (requestedIds.length !== currentIds.length) {
    throw new Error("Invalid reorder payload size");
  }

  const requestedSet = new Set(requestedIds);
  if (requestedSet.size !== requestedIds.length) {
    throw new Error("Duplicate item id in reorder payload");
  }

  const currentSet = new Set(currentIds);
  for (const id of requestedSet) {
    if (!currentSet.has(id)) {
      throw new Error("Reorder payload contains item outside target plan");
    }
  }
}
