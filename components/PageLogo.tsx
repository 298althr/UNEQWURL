"use client";

import { useTheme } from "./ThemeProvider";

type PageKey = "songs" | "library" | "submissions" | "account" | "console";

interface PageLogoProps {
  page: PageKey;
}

export default function PageLogo({ page }: PageLogoProps) {
  const { theme } = useTheme();
  const mode = theme === "light" ? "lightmode" : "darkmode";

  return (
    <div className="page-logo">
      <div className="logo-mark">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
      <img
        src={`/assets/logo/logo-${mode}-${page}.png`}
        alt="UNEQWURL"
        className="page-logo-img"
      />
    </div>
  );
}
