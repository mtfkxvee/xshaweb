import { useEffect, useState } from "react";
import { Icon } from "./icon";

export const THEME_STORAGE_KEY = "xsha-theme";

function readTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

// Manual light/dark toggle. Default is always light regardless of OS
// preference — styles.css only applies the dark tokens when <html> carries
// data-theme="dark", which this button is the only thing that sets. The
// blocking inline script in __root.tsx applies a stored choice before first
// paint so returning visitors don't see a light-mode flash.
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing / storage disabled — the toggle still works for
      // this page view, it just won't persist across reloads.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      className={`flex h-9 w-9 items-center justify-center rounded-full text-primary transition-transform active:scale-90 ${className}`}
    >
      <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} />
    </button>
  );
}
