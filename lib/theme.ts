// ============================================================
// UNEQWURL — Theme, density & motion helpers
// ============================================================

const THEME_KEY = "298eq-theme";
const DENSITY_KEY = "298eq-density";
const MOTION_KEY = "298eq-reduced-motion";

export type Theme = "dark" | "light";
export type Density = "normal" | "compact";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  if (window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}

export function setTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
}

export function getDensity(): Density {
  if (typeof window === "undefined") return "normal";
  const stored = localStorage.getItem(DENSITY_KEY);
  return stored === "compact" ? "compact" : "normal";
}

export function setDensity(density: Density) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DENSITY_KEY, density);
  if (density === "compact") {
    document.documentElement.setAttribute("data-density", "compact");
  } else {
    document.documentElement.removeAttribute("data-density");
  }
}

export function getReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(MOTION_KEY);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function setReducedMotion(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MOTION_KEY, String(enabled));
  if (enabled) {
    document.documentElement.setAttribute("data-reduced-motion", "true");
  } else {
    document.documentElement.removeAttribute("data-reduced-motion");
  }
}
