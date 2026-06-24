"use client";

import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import {
  Users,
  Upload,
  FileText,
  Activity,
  Sliders,
  ShieldAlert,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type AdminUser = {
  id: string;
  username: string;
  submission_count: number;
  avg_score: number | null;
  last_submission_at: string | null;
};

type AdminUpload = {
  id: string;
  username: string;
  upload_type: "music" | "podcast" | "voice";
  original_filename: string;
  title: string;
  artist: string;
  album: string | null;
  genre: string | null;
  file_size_bytes: number;
  mime_type: string;
  duration_seconds: number | null;
  uploaded_at: string;
};

type AdminSubmission = {
  id: string;
  username: string;
  song_title: string;
  settings: Record<string, number>;
  score: number;
  score_breakdown: Record<string, { diff: number; weighted: number }>;
  submitted_at: string;
};

type AdminSession = {
  id: string;
  username: string;
  song_title: string;
  session_start: string;
  session_end: string;
  average_298eq: number;
  final_settings: Record<string, number>;
  ab_toggles: number;
  created_at: string;
};

type AdminControl = {
  id: string;
  username: string;
  audio_title: string;
  settings: Record<string, number>;
  controls_log: Record<string, unknown> | null;
  score: number | null;
  submitted_at: string;
};

type TabKey = "users" | "uploads" | "submissions" | "sessions" | "controls";

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("users");
  const [search, setSearch] = useState("");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [uploads, setUploads] = useState<AdminUpload[]>([]);
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [controls, setControls] = useState<AdminControl[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedControl, setExpandedControl] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.role === "admin") {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      })
      .catch(() => {
        setIsAdmin(false);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    Promise.all([
      fetch("/api/admin/users").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/uploads").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/submissions").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/sessions").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/controls").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([u, up, sub, ses, ctrl]) => {
        setUsers(u);
        setUploads(up);
        setSubmissions(sub);
        setSessions(ses);
        setControls(ctrl);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load admin data.");
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getDuration = (start: string, end: string) => {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const sec = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}m ${secs}s`;
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortArrow = (key: string) => {
    if (sortKey !== key) return null;
    return sortDir === "asc" ? (
      <ChevronUp size={12} className="inline ml-1" />
    ) : (
      <ChevronDown size={12} className="inline ml-1" />
    );
  };

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase();
    let data = users.filter((u) => u.username.toLowerCase().includes(term));
    data.sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? "";
      const bVal = (b as any)[sortKey] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return data;
  }, [users, search, sortKey, sortDir]);

  const filteredUploads = useMemo(() => {
    const term = search.toLowerCase();
    return uploads.filter(
      (u) =>
        u.username.toLowerCase().includes(term) ||
        u.title.toLowerCase().includes(term) ||
        u.upload_type.toLowerCase().includes(term)
    );
  }, [uploads, search]);

  const filteredSubmissions = useMemo(() => {
    const term = search.toLowerCase();
    return submissions.filter(
      (s) =>
        s.username.toLowerCase().includes(term) ||
        s.song_title.toLowerCase().includes(term)
    );
  }, [submissions, search]);

  const filteredSessions = useMemo(() => {
    const term = search.toLowerCase();
    return sessions.filter(
      (s) =>
        s.username.toLowerCase().includes(term) ||
        s.song_title.toLowerCase().includes(term)
    );
  }, [sessions, search]);

  const filteredControls = useMemo(() => {
    const term = search.toLowerCase();
    return controls.filter(
      (c) =>
        c.username.toLowerCase().includes(term) ||
        c.audio_title.toLowerCase().includes(term)
    );
  }, [controls, search]);

  if (isAdmin === false) {
    return (
      <div className="container min-h-screen max-w-4xl px-4 py-8 pb-24 flex flex-col items-center justify-center text-center">
        <ShieldAlert size={48} className="text-red-400 mb-4" />
        <h1 className="text-2xl font-extrabold text-white mb-2">Access Denied</h1>
        <p className="text-sm text-muted mb-6">
          You do not have permission to view the admin panel.
        </p>
        <BottomNav />
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "users", label: "Users", icon: <Users size={16} />, count: users.length },
    { key: "uploads", label: "Uploads", icon: <Upload size={16} />, count: uploads.length },
    { key: "submissions", label: "Submissions", icon: <FileText size={16} />, count: submissions.length },
    { key: "sessions", label: "Sessions", icon: <Activity size={16} />, count: sessions.length },
    { key: "controls", label: "Controls", icon: <Sliders size={16} />, count: controls.length },
  ];

  return (
    <div className="container min-h-screen max-w-6xl px-4 py-8 pb-24">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div className="logo flex items-center gap-3">
          <div className="logo-mark flex items-end gap-1">
            <span className="w-1.5 h-3 bg-accent rounded-full"></span>
            <span className="w-1.5 h-7 bg-accent rounded-full"></span>
            <span className="w-1.5 h-5 bg-accent rounded-full"></span>
            <span className="w-1.5 h-8 bg-accent rounded-full"></span>
          </div>
          <div className="logo-text text-xl font-extrabold tracking-wide">
            298<span className="text-accent">EQ</span>{" "}
            <span className="text-xs uppercase text-muted font-normal tracking-widest ml-2">
              Admin Panel
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {loading ? (
          <div className="py-12 text-center text-sm font-mono text-muted animate-pulse">
            Loading admin intelligence dashboard...
          </div>
        ) : error ? (
          <div className="p-5 rounded-xl border border-red-500/20 bg-red-500/10 text-center text-sm font-mono text-red-400">
            {error}
          </div>
        ) : (
          <>
            {/* Stats */}
            <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`text-left p-4 rounded-xl border transition-colors ${
                    activeTab === t.key
                      ? "border-accent/40 bg-accent/10"
                      : "border-white/10 bg-surface hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-2 text-muted text-xs font-semibold uppercase tracking-wider mb-2">
                    {t.icon}
                    {t.label}
                  </div>
                  <div className="text-2xl font-extrabold text-white">{t.count}</div>
                </button>
              ))}
            </section>

            {/* Search */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-surface pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-muted/50 focus:outline-none focus:border-accent/40"
              />
            </div>

            {/* Users Tab */}
            {activeTab === "users" && (
              <section className="rounded-xl border border-white/10 bg-surface/40 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-muted uppercase tracking-wider font-semibold">
                      <th className="p-3 cursor-pointer" onClick={() => handleSort("username")}>
                        Username {sortArrow("username")}
                      </th>
                      <th className="p-3 cursor-pointer text-right" onClick={() => handleSort("submission_count")}>
                        Submissions {sortArrow("submission_count")}
                      </th>
                      <th className="p-3 cursor-pointer text-right" onClick={() => handleSort("avg_score")}>
                        Avg Score {sortArrow("avg_score")}
                      </th>
                      <th className="p-3 cursor-pointer" onClick={() => handleSort("last_submission_at")}>
                        Last Submission {sortArrow("last_submission_at")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-muted">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-muted/50">
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 font-sans font-semibold text-white">@{u.username}</td>
                          <td className="p-3 text-right">{u.submission_count}</td>
                          <td className="p-3 text-right">
                            {u.avg_score != null ? u.avg_score.toFixed(2) : "—"}
                          </td>
                          <td className="p-3">
                            {u.last_submission_at
                              ? new Date(u.last_submission_at).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>
            )}

            {/* Uploads Tab */}
            {activeTab === "uploads" && (
              <section className="rounded-xl border border-white/10 bg-surface/40 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-muted uppercase tracking-wider font-semibold">
                      <th className="p-3">User</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Artist</th>
                      <th className="p-3 text-right">Size</th>
                      <th className="p-3">Uploaded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-muted">
                    {filteredUploads.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted/50">
                          No uploads found.
                        </td>
                      </tr>
                    ) : (
                      filteredUploads.map((u) => (
                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 font-sans font-semibold text-white">@{u.username}</td>
                          <td className="p-3">
                            <span className="rounded px-1.5 py-0.5 text-[10px] uppercase bg-white/10 text-muted">
                              {u.upload_type}
                            </span>
                          </td>
                          <td className="p-3 font-sans">{u.title}</td>
                          <td className="p-3">{u.artist}</td>
                          <td className="p-3 text-right">{formatBytes(u.file_size_bytes)}</td>
                          <td className="p-3">
                            {new Date(u.uploaded_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>
            )}

            {/* Submissions Tab */}
            {activeTab === "submissions" && (
              <section className="rounded-xl border border-white/10 bg-surface/40 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-muted uppercase tracking-wider font-semibold">
                      <th className="p-3">User</th>
                      <th className="p-3">Audio</th>
                      <th className="p-3 text-right">Score</th>
                      <th className="p-3">Settings</th>
                      <th className="p-3">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-muted">
                    {filteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted/50">
                          No submissions found.
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((s) => (
                        <tr key={s.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 font-sans font-semibold text-white">@{s.username}</td>
                          <td className="p-3 font-sans">{s.song_title}</td>
                          <td className="p-3 text-right text-accent font-bold">
                            {s.score != null ? s.score.toFixed(1) : "—"}
                          </td>
                          <td className="p-3">
                            <pre className="text-[10px] bg-black/30 rounded p-1 overflow-x-auto max-w-[200px]">
                              {JSON.stringify(s.settings, null, 1).slice(0, 80)}...
                            </pre>
                          </td>
                          <td className="p-3">
                            {new Date(s.submitted_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>
            )}

            {/* Sessions Tab */}
            {activeTab === "sessions" && (
              <section className="rounded-xl border border-white/10 bg-surface/40 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-muted uppercase tracking-wider font-semibold">
                      <th className="p-3">User</th>
                      <th className="p-3">Audio</th>
                      <th className="p-3">Duration</th>
                      <th className="p-3 text-right">Avg 298EQ</th>
                      <th className="p-3 text-right">A/B Toggles</th>
                      <th className="p-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-muted">
                    {filteredSessions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted/50">
                          No sessions found.
                        </td>
                      </tr>
                    ) : (
                      filteredSessions.map((s) => (
                        <tr key={s.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 font-sans font-semibold text-white">@{s.username}</td>
                          <td className="p-3 font-sans">{s.song_title}</td>
                          <td className="p-3">
                            {getDuration(s.session_start, s.session_end)}
                          </td>
                          <td className="p-3 text-right text-accent font-bold">
                            {Math.round(((s.average_298eq + 12) / 24) * 100)}%
                          </td>
                          <td className="p-3 text-right font-bold text-white">
                            {s.ab_toggles}
                          </td>
                          <td className="p-3">
                            {new Date(s.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>
            )}

            {/* Controls Tab */}
            {activeTab === "controls" && (
              <section className="rounded-xl border border-white/10 bg-surface/40 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-muted uppercase tracking-wider font-semibold">
                      <th className="p-3">User</th>
                      <th className="p-3">Audio</th>
                      <th className="p-3 text-right">Score</th>
                      <th className="p-3">Submitted</th>
                      <th className="p-3">Controls Log</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-muted">
                    {filteredControls.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted/50">
                          No controls logs found.
                        </td>
                      </tr>
                    ) : (
                      filteredControls.map((c) => (
                        <tr key={c.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 font-sans font-semibold text-white">@{c.username}</td>
                          <td className="p-3 font-sans">{c.audio_title}</td>
                          <td className="p-3 text-right text-accent font-bold">
                            {c.score != null ? c.score.toFixed(1) : "—"}
                          </td>
                          <td className="p-3">
                            {new Date(c.submitted_at).toLocaleString()}
                          </td>
                          <td className="p-3">
                            {c.controls_log ? (
                              <button
                                onClick={() =>
                                  setExpandedControl(
                                    expandedControl === c.id ? null : c.id
                                  )
                                }
                                className="text-accent text-[10px] hover:underline"
                              >
                                {expandedControl === c.id ? "Hide" : "View"}
                              </button>
                            ) : (
                              <span className="text-muted/50">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {expandedControl && (
                  <div className="p-4 border-t border-white/10">
                    <pre className="text-[10px] bg-black/40 rounded-lg p-3 overflow-x-auto text-muted">
                      {JSON.stringify(
                        controls.find((c) => c.id === expandedControl)?.controls_log,
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
