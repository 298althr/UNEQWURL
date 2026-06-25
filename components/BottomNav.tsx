"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, FolderOpen, SlidersHorizontal, User, Trophy } from "lucide-react";

const LINK_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, id: "dashboard", navItem: "dashboard" },
  { href: "/soundfiles", label: "Library", icon: FolderOpen, id: "library", navItem: "library" },
  { href: "/console", label: "Console", icon: SlidersHorizontal, id: "console", navItem: "console" },
  { href: "/submissions", label: "Results", icon: Trophy, id: "results", navItem: "results" },
  { href: "/account", label: "Profile", icon: User, id: "profile", navItem: "profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (id: string, href: string) => {
    if (id === "console") return pathname === "/console" || pathname.startsWith("/room");
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
    </nav>
  );
}
