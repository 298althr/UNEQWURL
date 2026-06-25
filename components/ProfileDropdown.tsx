"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { User, Upload, LogOut, Shield, Moon, Sun, LayoutTemplate } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ProfileDropdown() {
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const { theme, setTheme, density, setDensity } = useTheme();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.username) setUsername(data.username);
        if (data?.role === "admin") setIsAdmin(true);
      })
      .catch(() => {});
  }, []);

  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : "xx";

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Continue clearing local state even if the network call fails
    }
    // Clear local state that could leak across sessions
    try {
      localStorage.removeItem("298eq_active_sessions");
      localStorage.removeItem("298eq_room_state");
      localStorage.removeItem("298eq_console_settings");
      sessionStorage.clear();
    } catch {
      // ignore storage errors
    }
    // Broadcast logout so other tabs invalidate
    try {
      localStorage.setItem("auth:logout", String(Date.now()));
    } catch {
      // ignore
    }
    // Notify service worker to clear cached auth pages
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CLEAR_AUTH_CACHE" });
    }
    window.location.href = "/login";
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const toggleDensity = () => setDensity(density === "normal" ? "compact" : "normal");

  return (
    <div className="profile-menu">
      <button
        type="button"
        className="profile-trigger"
        aria-label="User profile"
        data-testid="profile-trigger"
      >
        {initials}
      </button>
      <div className="profile-dropdown" data-testid="profile-dropdown">
        {username && <div className="profile-user">{username}</div>}

        {/* Theme toggle */}
        <button type="button" onClick={toggleTheme} className="profile-toggle">
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>

        {/* Density toggle */}
        <button type="button" onClick={toggleDensity} className="profile-toggle">
          <LayoutTemplate size={14} />
          {density === "compact" ? "Normal Density" : "Compact Density"}
        </button>

        <Link href="/account">
          <User size={14} />
          Account
        </Link>
        <Link href="/soundfiles">
          <Upload size={14} />
          Sound Files
        </Link>
        {isAdmin && (
          <Link href="/admin">
            <Shield size={14} />
            Admin Panel
          </Link>
        )}
        <button type="button" onClick={handleLogout} data-testid="logout-button">
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </div>
  );
}
