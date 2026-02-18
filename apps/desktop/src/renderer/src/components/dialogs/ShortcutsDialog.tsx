import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SHORTCUT_DEFS,
  hydrateShortcuts,
  getBindings,
  setBindings,
  resetBindings,
  resetAll,
  formatBinding,
  type ShortcutAction,
  type KeyBinding,
} from "@/lib/shortcuts";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export function ShortcutsDialog({ open, onOpenChange }: Props) {
  const [recording, setRecording] = useState<ShortcutAction | null>(null);
  const [current, setCurrent] = useState<Record<string, KeyBinding[]>>({});

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      await hydrateShortcuts();
      if (cancelled) return;
      const state: Record<string, KeyBinding[]> = {};
      for (const def of SHORTCUT_DEFS) {
        state[def.action] = getBindings(def.action);
      }
      setCurrent(state);
      setRecording(null);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!recording) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setRecording(null);
        return;
      }
      // Ignore lone modifier keys
      if (["Control", "Shift", "Meta", "Alt"].includes(e.key)) return;

      const binding: KeyBinding = {
        key: e.key,
        ...(e.ctrlKey || e.metaKey ? { ctrlKey: true } : {}),
        ...(e.shiftKey ? { shiftKey: true } : {}),
      };
      setBindings(recording, [binding]);
      setCurrent((prev) => ({ ...prev, [recording]: [binding] }));
      setRecording(null);
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [recording]);

  const handleReset = (action: ShortcutAction) => {
    resetBindings(action);
    const def = SHORTCUT_DEFS.find((d) => d.action === action);
    setCurrent((prev) => ({ ...prev, [action]: def?.defaults ?? [] }));
  };

  const handleResetAll = () => {
    resetAll();
    const state: Record<string, KeyBinding[]> = {};
    for (const def of SHORTCUT_DEFS) {
      state[def.action] = def.defaults;
    }
    setCurrent(state);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Raccourcis clavier</DialogTitle>
          <DialogDescription>Cliquez sur un raccourci pour le modifier. Echap pour annuler.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {SHORTCUT_DEFS.map((def) => (
            <div key={def.action} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent">
              <span className="text-sm">{def.label}</span>
              <div className="flex items-center gap-1">
                {recording === def.action ? (
                  <Badge variant="destructive" className="text-[10px] animate-pulse">
                    Appuyez...
                  </Badge>
                ) : (
                  (current[def.action] ?? []).map((b, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-[10px] cursor-pointer"
                      onClick={() => setRecording(def.action)}
                    >
                      {formatBinding(b)}
                    </Badge>
                  ))
                )}
                {recording !== def.action && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-1.5"
                    onClick={() => setRecording(def.action)}
                  >
                    Modifier
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-1.5"
                  onClick={() => handleReset(def.action)}
                >
                  Reset
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleResetAll}>
            Tout reinitialiser
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
