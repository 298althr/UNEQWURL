"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getTheme, setTheme, getDensity, setDensity, getReducedMotion, setReducedMotion, type Theme, type Density } from "@/lib/theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  density: Density;
  setDensity: (d: Density) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  density: "normal",
  setDensity: () => {},
  reducedMotion: false,
  setReducedMotion: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, _setTheme] = useState<Theme>("dark");
  const [density, _setDensity] = useState<Density>("normal");
  const [reducedMotion, _setReducedMotion] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    _setTheme(getTheme());
    _setDensity(getDensity());
    _setReducedMotion(getReducedMotion());
    setHydrated(true);
  }, []);

  const handleSetTheme = (t: Theme) => {
    _setTheme(t);
    setTheme(t);
  };

  const handleSetDensity = (d: Density) => {
    _setDensity(d);
    setDensity(d);
  };

  const handleSetReducedMotion = (v: boolean) => {
    _setReducedMotion(v);
    setReducedMotion(v);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: handleSetTheme,
        density,
        setDensity: handleSetDensity,
        reducedMotion,
        setReducedMotion: handleSetReducedMotion,
      }}
    >
      {children}
      {/* Prevent FOUC flash until hydrated */}
      {!hydrated && (
        <style>{`
          html { visibility: visible !important; }
        `}</style>
      )}
    </ThemeContext.Provider>
  );
}
