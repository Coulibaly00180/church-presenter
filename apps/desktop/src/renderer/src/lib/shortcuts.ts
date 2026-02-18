export type ShortcutAction =
  | "targetA" | "targetB" | "targetC"
  | "toggleBlack" | "toggleWhite" | "resume"
  | "prev" | "next"
  | "toggleProjection";

export type KeyBinding = {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
};

export type ShortcutDef = {
  action: ShortcutAction;
  label: string;
  defaults: KeyBinding[];
};

export const SHORTCUT_DEFS: ShortcutDef[] = [
  { action: "targetA", label: "Ecran A", defaults: [{ key: "1" }] },
  { action: "targetB", label: "Ecran B", defaults: [{ key: "2" }] },
  { action: "targetC", label: "Ecran C", defaults: [{ key: "3" }] },
  { action: "toggleBlack", label: "Ecran noir", defaults: [{ key: "b" }, { key: "B" }] },
  { action: "toggleWhite", label: "Ecran blanc", defaults: [{ key: "w" }, { key: "W" }] },
  { action: "resume", label: "Reprendre (Normal)", defaults: [{ key: "r" }, { key: "R" }] },
  { action: "prev", label: "Precedent", defaults: [{ key: "ArrowLeft" }, { key: "q" }, { key: "Q" }] },
  { action: "next", label: "Suivant", defaults: [{ key: "ArrowRight" }, { key: " " }, { key: "d" }, { key: "D" }] },
  { action: "toggleProjection", label: "Basculer projection", defaults: [{ key: "p", ctrlKey: true }] },
];

type OverrideMap = Partial<Record<ShortcutAction, KeyBinding[]>>;
const ACTIONS = new Set<ShortcutAction>(SHORTCUT_DEFS.map((def) => def.action));

let overridesCache: OverrideMap = {};
let hydrated = false;
let hydratingPromise: Promise<void> | null = null;

function sanitizeBinding(value: unknown): KeyBinding | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.key !== "string" || rec.key.length === 0) return null;
  const out: KeyBinding = { key: rec.key };
  if (typeof rec.ctrlKey === "boolean") out.ctrlKey = rec.ctrlKey;
  if (typeof rec.shiftKey === "boolean") out.shiftKey = rec.shiftKey;
  return out;
}

function sanitizeOverrides(value: unknown): OverrideMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const rec = value as Record<string, unknown>;
  const out: OverrideMap = {};
  Object.entries(rec).forEach(([action, rawBindings]) => {
    if (!ACTIONS.has(action as ShortcutAction)) return;
    if (!Array.isArray(rawBindings)) return;
    const bindings = rawBindings.map((entry) => sanitizeBinding(entry)).filter((entry): entry is KeyBinding => !!entry);
    out[action as ShortcutAction] = bindings;
  });
  return out;
}

function getCachedOverrides(): OverrideMap {
  return overridesCache;
}

async function persistOverrides(overrides: OverrideMap): Promise<void> {
  try {
    await window.cp.settings.setShortcuts(overrides as Record<string, KeyBinding[]>);
  } catch {
    // Ignore persistence errors; local cache remains usable.
  }
}

export async function hydrateShortcuts(): Promise<void> {
  if (hydrated) return;
  if (hydratingPromise) return hydratingPromise;
  hydratingPromise = (async () => {
    try {
      const result = await window.cp.settings.getShortcuts();
      if (result.ok) {
        overridesCache = sanitizeOverrides(result.shortcuts);
      } else {
        overridesCache = {};
      }
    } catch {
      overridesCache = {};
    }
    hydrated = true;
    hydratingPromise = null;
  })();
  return hydratingPromise;
}

export function getBindings(action: ShortcutAction): KeyBinding[] {
  const overrides = getCachedOverrides();
  if (overrides[action]) return overrides[action]!;
  const def = SHORTCUT_DEFS.find((d) => d.action === action);
  return def?.defaults ?? [];
}

export function setBindings(action: ShortcutAction, bindings: KeyBinding[]): void {
  const overrides = { ...getCachedOverrides() };
  overrides[action] = bindings.map((binding) => ({ ...binding }));
  overridesCache = overrides;
  hydrated = true;
  void persistOverrides(overrides);
}

export function resetBindings(action: ShortcutAction): void {
  const overrides = { ...getCachedOverrides() };
  delete overrides[action];
  overridesCache = overrides;
  hydrated = true;
  void persistOverrides(overrides);
}

export function resetAll(): void {
  overridesCache = {};
  hydrated = true;
  void persistOverrides({});
}

function matchesBinding(e: KeyboardEvent, binding: KeyBinding): boolean {
  const wantCtrl = !!binding.ctrlKey;
  const hasCtrl = e.ctrlKey || e.metaKey;
  if (wantCtrl !== hasCtrl) return false;

  const wantShift = !!binding.shiftKey;
  if (wantShift !== e.shiftKey) return false;

  if (e.key === binding.key) return true;
  if (e.key.toLowerCase() === binding.key.toLowerCase()) return true;
  return false;
}

export function matchAction(e: KeyboardEvent): ShortcutAction | null {
  const overrides = getCachedOverrides();
  for (const def of SHORTCUT_DEFS) {
    const bindings = overrides[def.action] ?? def.defaults;
    for (const b of bindings) {
      if (matchesBinding(e, b)) return def.action;
    }
  }
  return null;
}

export function formatBinding(b: KeyBinding): string {
  const parts: string[] = [];
  if (b.ctrlKey) parts.push("Ctrl");
  if (b.shiftKey) parts.push("Shift");
  const keyLabel =
    b.key === " " ? "Espace" :
    b.key === "ArrowLeft" ? "\u2190" :
    b.key === "ArrowRight" ? "\u2192" :
    b.key === "ArrowUp" ? "\u2191" :
    b.key === "ArrowDown" ? "\u2193" :
    b.key.length === 1 ? b.key.toUpperCase() :
    b.key;
  parts.push(keyLabel);
  return parts.join("+");
}
