import { useState, useEffect } from "react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try {
        const res = await window.cp.settings.getTheme();
        if (cancelled) return;
        if (res.ok && (res.theme === "light" || res.theme === "dark")) {
          setTheme(res.theme);
          setHydrated(true);
          return;
        }
      } catch {
        // Keep system preference fallback.
      }
      if (!cancelled) setHydrated(true);
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    // Keep data-theme for backward compatibility during migration
    root.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!hydrated) return;
    void window.cp.settings.setTheme(theme);
  }, [hydrated, theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggle };
}
