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

const STORAGE_KEY = "cp-shortcuts";

type OverrideMap = Partial<Record<ShortcutAction, KeyBinding[]>>;

function getOverrides(): OverrideMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOverrides(overrides: OverrideMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function getBindings(action: ShortcutAction): KeyBinding[] {
  const overrides = getOverrides();
  if (overrides[action]) return overrides[action]!;
  const def = SHORTCUT_DEFS.find((d) => d.action === action);
  return def?.defaults ?? [];
}

export function setBindings(action: ShortcutAction, bindings: KeyBinding[]): void {
  const overrides = getOverrides();
  overrides[action] = bindings;
  saveOverrides(overrides);
}

export function resetBindings(action: ShortcutAction): void {
  const overrides = getOverrides();
  delete overrides[action];
  saveOverrides(overrides);
}

export function resetAll(): void {
  localStorage.removeItem(STORAGE_KEY);
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
  const overrides = getOverrides();
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
