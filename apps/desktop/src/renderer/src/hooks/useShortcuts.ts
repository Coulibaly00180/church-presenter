import { useEffect } from "react";
import { matchAction, hydrateShortcuts, type ShortcutAction } from "@/lib/shortcuts";

type ShortcutHandler = (action: ShortcutAction) => void;

/**
 * Registers a global keydown listener that calls `handler` with the matched
 * ShortcutAction when a keyboard event matches a known binding.
 *
 * Automatically hydrates shortcut overrides from settings on first call.
 */
export function useShortcuts(handler: ShortcutHandler, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    // Ensure overrides are loaded (no-op if already hydrated)
    void hydrateShortcuts();

    const onKeyDown = (e: KeyboardEvent) => {
      // Trace every keydown in live mode so we can debug navigation issues
      if (process.env.NODE_ENV !== "production") {
        console.log("[shortcuts] keydown", e.key, "target:", (e.target as HTMLElement)?.tagName);
      }

      // Ignore events originating from text inputs/textareas
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }

      const action = matchAction(e);
      if (action) {
        e.preventDefault();
        handler(action);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handler, enabled]);
}
