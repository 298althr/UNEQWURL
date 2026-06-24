"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, FolderOpen, SlidersHorizontal, User, Trophy } from "lucide-react";

type ActiveSession = {
  id: string;
  title: string;
  artist: string;
  type: "music" | "podcast" | "live" | "stream";
  isStream: boolean;
  streamUrl?: string;
  youtubeUrl?: string;
};

const LINK_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, id: "dashboard", navItem: "dashboard" },
  { href: "/soundfiles", label: "Library", icon: FolderOpen, id: "library", navItem: "library" },
  { href: "/submissions", label: "Results", icon: Trophy, id: "results", navItem: "results" },
  { href: "/account", label: "Profile", icon: User, id: "profile", navItem: "profile" },
];

function resolveConsoleUrl(): string {
  try {
    const raw = localStorage.getItem("298eq_active_sessions");
    if (!raw) return "/dashboard";
    const sessions = JSON.parse(raw) as Record<string, ActiveSession | null>;
    const active = Object.values(sessions).find((s) => s !== null);
    if (!active) return "/dashboard";
    if (active.isStream) {
      const params = new URLSearchParams({
        url: active.streamUrl || "",
        type: active.type,
        title: active.title,
        artist: active.artist,
        youtubeUrl: active.youtubeUrl || "",
      });
      return `/room/stream?${params.toString()}`;
    }
    return `/room/${active.id}`;
  } catch {
    return "/dashboard";
  }
}

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (id: string, href: string) => {
    if (id === "console") return pathname.startsWith("/room");
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href);
  };

  return (
    <nav className="mobile-nav">
      {LINK_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.id, item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={active ? "active" : ""}
            data-nav-item={item.navItem}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
      {/* Console — routes to active session or fallback */}
      <ConsoleButton pathname={pathname} data-nav-item="console" />
    </nav>
  );
}

function ConsoleButton({ pathname, "data-nav-item": navItem }: { pathname: string; "data-nav-item"?: string }) {
  const active = pathname.startsWith("/room");
  return (
    <button
      type="button"
      className={active ? "active" : ""}
      data-nav-item={navItem}
      onClick={() => {
        window.location.href = resolveConsoleUrl();
      }}
    >
      <SlidersHorizontal size={18} />
      Console
    </button>
  );
}
