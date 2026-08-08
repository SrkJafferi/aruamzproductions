"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "aruamz-theme";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export const useTheme = () => useContext(ThemeContext);

/**
 * Inlined before paint so the stored theme is applied on the very first frame —
 * without this the dark default would flash before hydration. It also flags that
 * JS is live, which is what unlocks the scroll-reveal opacity rules.
 */
export const themeScript = `(function(){document.documentElement.classList.add("js");try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}})()`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = document.documentElement.dataset.theme;
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* private mode — the in-memory theme still applies */
      }
      return next;
    });
  }, []);

  return <ThemeContext value={{ theme, toggle }}>{children}</ThemeContext>;
}
