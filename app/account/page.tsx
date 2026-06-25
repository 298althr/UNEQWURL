"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";
import ProfileDropdown from "@/components/ProfileDropdown";
import ConfirmationModal from "@/components/ConfirmationModal";
import PageLogo from "@/components/PageLogo";
import { User, Play, Trash2, Camera, Pencil } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { useTheme } from "@/components/ThemeProvider";

type UserInfo = {
  username: string;
  role: string;
  email: string;
  phone: string;
  displayName: string;
  avatarUrl: string | null;
};

type UploadStat = {
  id: string;
  upload_type: string;
  original_filename: string;
  title: string;
  artist: string;
  album: string | null;
  genre: string | null;
  file_size_bytes: number;
  uploaded_at: string;
};

export default function AccountPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [uploads, setUploads] = useState<UploadStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/uploads").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([userData, uploadsData]) => {
        setUser(userData);
        setUploads(uploadsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      displayName: String(form.get("displayName") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
    };

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        setEditingProfile(false);
      }
    } catch {
      /* swallow */
    } finally {
      setSaving(false);
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function daysSinceUpload(uploadedAt: string) {
    const diff = Date.now() - new Date(uploadedAt).getTime();
    return Math.floor(diff / (24 * 60 * 60 * 1000));
  }

  function normalizeType(type: string): string {
    if (type === "voice") return "live";
    const valid = ["music", "podcast", "live", "stream"];
    return valid.includes(type) ? type : "music";
  }

  return (
    <div className="container mx-auto min-h-screen account-page">
      <ConfirmationModal
        open={showLogoutConfirm}
        title="Logout"
        message={`Are you sure you want to sign out of your ${APP_NAME} studio session?`}
        confirmLabel="Logout"
        cancelLabel="Stay logged in"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        confirmVariant="danger"
      />

      {/* Header */}
      <header className="header header-with-profile header-desktop-row">
        <PageLogo page="account" />
        <div className="header-desktop-nav">
          <DesktopNav />
        </div>
        <ProfileDropdown />
      </header>

      <main className="pb-32">
        {/* Hero */}
        <section className="hero relative overflow-hidden rounded-2xl mb-8">
          <div className="page-hero-bg absolute inset-0 bg-cover bg-center pointer-events-none" style={{ backgroundImage: "url('/assets/hero/profile.png')" }} />
          <div className="page-hero-overlay absolute inset-0 pointer-events-none z-[1]" />
          <div className="relative z-[2] p-10 md:p-14">
            <div className="hero-badge">Account</div>
            <h1>Account <span className="gradient-text">Settings</span></h1>
            <p>Manage your profile identities, active workspace configurations, and saved audio master sessions.</p>
          </div>
        </section>

        {loading && (
          <div className="dashboard-loading">
            <div className="loading-spinner" />
            <p>Loading account...</p>
          </div>
        )}

        {!loading && user && (
          <>
            {/* Identity Profile */}
            <div className="section-label">Identity Profile</div>

            {!editingProfile ? (
              /* Collapsed view */
              <div className="identity-card-collapsed">
                {/* Gradient banner */}
                <div className="identity-card-banner" />
                {/* Avatar overlapping banner */}
                <div className="identity-card-header">
                  <div className="identity-card-avatar-wrap">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="avatar" className="avatar-image" />
                    ) : (
                      <User size={22} />
                    )}
                    <span className="identity-card-status" />
                  </div>
                  <button
                    type="button"
                    className="identity-card-edit"
                    onClick={() => setEditingProfile(true)}
                    title="Edit profile"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
                {/* Body */}
                <div className="identity-card-body">
                  <div className="identity-card-name">{user.displayName}</div>
                  <div className="identity-card-role">
                    {user.role === "student" ? "Student" : user.role === "admin" ? "Pro Creator Node" : user.role}
                  </div>
                  <div className="identity-card-email">{user.email}</div>
                  <div className="identity-card-stats">
                    <div className="identity-stat">
                      <span className="identity-stat-value">{uploads.length}</span>
                      <span className="identity-stat-label">Uploads</span>
                    </div>
                    <div className="identity-stat">
                      <span className="identity-stat-value">{uploads.filter(u => u.upload_type === "music").length}</span>
                      <span className="identity-stat-label">Tracks</span>
                    </div>
                    <div className="identity-stat">
                      <span className="identity-stat-value">{uploads.filter(u => ["podcast", "live", "stream"].includes(u.upload_type)).length}</span>
                      <span className="identity-stat-label">Sessions</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Expanded edit form */
              <div className="profile-card">
                {/* Photo Uploader */}
                <div className="photo-uploader">
                  <div className="avatar-wrapper">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="avatar" className="avatar-image" />
                    ) : (
                      <div className="avatar-image flex items-center justify-center bg-[#16161f]">
                        <User size={24} className="text-muted" />
                      </div>
                    )}
                    <div className="avatar-upload-overlay">
                      <Camera size={16} />
                    </div>
                  </div>
                  <div className="upload-meta-text">
                    <h4>Profile Avatar Picture</h4>
                    <p>Click image canvas to upload new image file. PNG or JPEG up to 4MB.</p>
                    <button type="button" className="upload-action-btn">Upload Image</button>
                  </div>
                </div>

                {/* Form */}
                <form className="form-grid" onSubmit={handleSaveProfile}>
                  <div className="form-group">
                    <label className="form-label">First &amp; Last Name</label>
                    <input
                      type="text"
                      name="displayName"
                      className="form-input"
                      defaultValue={user.displayName}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Workspace Role</label>
                    <input
                      type="text"
                      className="form-input"
                      value={user.role === "student" ? "Student" : user.role === "admin" ? "Pro Creator Node" : user.role}
                      disabled
                      readOnly
                      style={{ opacity: 0.5, cursor: "not-allowed" }}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      className="form-input"
                      defaultValue={user.email}
                      placeholder="name@example.com"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      className="form-input"
                      defaultValue={user.phone}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div className="form-group full-width" style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                    <button type="submit" className="btn-compact" disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      className="upload-action-btn"
                      onClick={() => setEditingProfile(false)}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Preferences */}
            <div className="section-label">Preferences</div>
            <div className="profile-card" style={{ gap: 12 }}>
              <ThemeToggle />
              <DensityToggle />
              <ReducedMotionToggle />
            </div>

            {/* Manage Uploaded Media */}
            <div className="section-label">Manage Uploaded Media &amp; Sessions</div>
            {uploads.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--muted)", padding: "8px 0" }}>
                No uploads yet. Go to your library to add music, podcast, live, or stream files.
              </p>
            ) : (
              <div className="media-list-stack">
                {uploads.map((u) => {
                  const nt = normalizeType(u.upload_type);
                  const days = daysSinceUpload(u.uploaded_at);
                  return (
                    <div key={u.id} className="media-session-row">
                      <div className="media-meta-left">
                        <div className={`category-dot ${nt}`} />
                        <div className="media-title-block">
                          <div className="media-name">{u.title}</div>
                          <div className="media-details">
                            {u.artist}{u.album ? ` · ${u.album}` : ""}{u.genre ? ` · ${u.genre}` : ""}
                            {days === 0 ? " · Today" : ` · ${days}d ago`}
                          </div>
                        </div>
                      </div>
                      <div className="media-actions-right">
                        <span className="media-size-tag">{formatSize(u.file_size_bytes)}</span>
                        <Link href={`/room/${u.id}`} className="media-action-btn" title="Mix Session">
                          <Play size={14} />
                        </Link>
                        <button className="media-action-btn delete" title="Delete Asset">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Danger Zone */}
            <div className="section-label">Danger Zone</div>
            <div className="profile-card danger-zone-card">
              <div className="danger-actions-row">
                <button type="button" className="account-btn-save" onClick={() => setShowLogoutConfirm(true)}>
                  Log Out Account Session
                </button>
                <button type="button" className="account-btn-ghost-danger">
                  Terminate Account Node Permanently
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="toggle-row">
      <div className="toggle-row-info">
        <h4>Interface Colorway Theme</h4>
        <p>Switch desktop environment framework modes.</p>
      </div>
      <div className="pill-group">
        <button className={`pill-btn ${theme === "dark" ? "active" : ""}`} onClick={() => setTheme("dark")}>Dark</button>
        <button className={`pill-btn ${theme === "light" ? "active" : ""}`} onClick={() => setTheme("light")}>Light</button>
      </div>
    </div>
  );
}

function DensityToggle() {
  const { density, setDensity } = useTheme();
  return (
    <div className="toggle-row">
      <div className="toggle-row-info">
        <h4>Fader Screen Layout Density</h4>
        <p>Choose high density console visualization profiles.</p>
      </div>
      <div className="pill-group">
        <button className={`pill-btn ${density === "normal" ? "active" : ""}`} onClick={() => setDensity("normal")}>Normal</button>
        <button className={`pill-btn ${density === "compact" ? "active" : ""}`} onClick={() => setDensity("compact")}>Compact</button>
      </div>
    </div>
  );
}

function ReducedMotionToggle() {
  const { reducedMotion, setReducedMotion } = useTheme();
  return (
    <div className={`toggle-row ${reducedMotion ? "active-switch" : ""}`} onClick={() => setReducedMotion(!reducedMotion)}>
      <div className="toggle-row-info">
        <h4>Reduce Console Animations</h4>
        <p>Minimize rendering loads across spectrum display canvases.</p>
      </div>
      <div className="param-switch" />
    </div>
  );
}
