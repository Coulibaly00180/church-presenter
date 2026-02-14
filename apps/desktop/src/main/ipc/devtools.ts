import type { CpDevtoolsOpenResult, CpDevtoolsTarget } from "../../shared/ipc";

export type DevtoolsOpeners = Partial<Record<CpDevtoolsTarget, () => void>>;

export function openDevtoolsWithGuard(
  target: CpDevtoolsTarget,
  options: { isPackaged: boolean; openers: DevtoolsOpeners }
): CpDevtoolsOpenResult {
  if (options.isPackaged) {
    return { ok: false, reason: "DISABLED_IN_PROD" };
  }
  options.openers[target]?.();
  return { ok: true };
}
