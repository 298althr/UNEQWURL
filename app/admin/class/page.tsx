"use client";

import { useState, useEffect, useCallback } from "react";
import { GraduationCap, Users, CheckCircle2, Circle, RefreshCw, Plus } from "lucide-react";

interface ClassSession {
  id: string;
  name: string;
  song_id: string | null;
  created_at: string;
  active: boolean;
  student_count: string;
}

interface CompletionRow {
  user_id: string;
  username: string;
  step_index: number;
  completed_at: string;
}

const STEP_COUNT = 10;

export default function AdminClassPage() {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [completions, setCompletions] = useState<CompletionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/class-sessions");
      if (res.ok) {
        const data = await res.json() as ClassSession[];
        setSessions(data);
        if (data.length > 0 && !selectedSession) {
          setSelectedSession(data[0].id);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedSession]);

  const loadCompletions = useCallback(async () => {
    if (!selectedSession) return;
    try {
      const res = await fetch(`/api/lesson-progress?session_id=${selectedSession}`);
      if (res.ok) {
        setCompletions(await res.json());
      }
    } catch { /* ignore */ }
  }, [selectedSession]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    loadCompletions();
    const interval = setInterval(loadCompletions, 5000);
    return () => clearInterval(interval);
  }, [loadCompletions]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/class-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setNewName("");
        setShowCreate(false);
        await loadSessions();
      }
    } catch { /* ignore */ }
    setCreating(false);
  };

  // Build student grid: username → [step completions]
  const studentMap = new Map<string, { username: string; steps: boolean[] }>();
  for (const c of completions) {
    if (!studentMap.has(c.user_id)) {
      studentMap.set(c.user_id, { username: c.username, steps: new Array(STEP_COUNT).fill(false) });
    }
    studentMap.get(c.user_id)!.steps[c.step_index] = true;
  }
  const students = Array.from(studentMap.entries()).sort((a, b) => a[1].username.localeCompare(b[1].username));

  // Per-step completion counts
  const stepCompletionCounts = Array(STEP_COUNT).fill(0);
  for (const [, info] of students) {
    info.steps.forEach((done, i) => { if (done) stepCompletionCounts[i]++; });
  }

  return (
    <div className="container" style={{ maxWidth: 1100, padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
        <GraduationCap size={24} style={{ color: "var(--accent)" }} />
        <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>Class Dashboard</h1>
        <button
          type="button"
          onClick={() => { loadSessions(); loadCompletions(); }}
          className="btn btn-secondary"
          style={{ marginLeft: "auto", padding: "6px 12px", fontSize: "12px" }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="btn btn-primary"
          style={{ padding: "6px 12px", fontSize: "12px" }}
        >
          <Plus size={12} /> New Session
        </button>
      </div>

      {showCreate && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Session name (e.g. Week 4 — Sound Quality)"
            className="preset-input"
            style={{ flex: 1 }}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            autoFocus
          />
          <button type="button" onClick={handleCreate} className="btn btn-primary" disabled={creating || !newName.trim()}>
            Create
          </button>
        </div>
      )}

      {/* Session selector */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedSession(s.id)}
            className={`preset-pill${selectedSession === s.id ? " active" : ""}`}
            style={{ padding: "8px 14px" }}
          >
            {s.name}
            <span style={{ marginLeft: "6px", fontSize: "10px", opacity: 0.6 }}>
              ({s.student_count} students)
            </span>
          </button>
        ))}
        {sessions.length === 0 && !loading && (
          <p style={{ color: "var(--muted)", fontSize: "13px" }}>No class sessions yet. Create one above.</p>
        )}
      </div>

      {/* Progress grid */}
      {selectedSession && students.length > 0 && (
        <>
          {/* Per-step completion summary */}
          <div style={{ marginBottom: "20px" }}>
            <div className="section-label" style={{ marginBottom: "8px" }}>Step Completion Summary</div>
            <div style={{ display: "flex", gap: "4px" }}>
              {stepCompletionCounts.map((count, i) => {
                const pct = (count / students.length) * 100;
                return (
                  <div key={i} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{
                      height: "4px",
                      background: pct >= 75 ? "#22c55e" : pct >= 50 ? "#eab308" : pct > 0 ? "#f97316" : "rgba(255,255,255,0.08)",
                      borderRadius: "2px",
                      marginBottom: "4px",
                    }} />
                    <span style={{ fontSize: "9px", color: "var(--muted)" }}>
                      {i + 1}
                    </span>
                    <br />
                    <span style={{ fontSize: "10px", fontWeight: 600 }}>
                      {count}/{students.length}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Student grid */}
          <div className="section-label" style={{ marginBottom: "8px" }}>
            <Users size={12} style={{ display: "inline", marginRight: "4px" }} />
            Student Progress ({students.length} students)
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: "11px" }}>
                    Student
                  </th>
                  {Array.from({ length: STEP_COUNT }, (_, i) => (
                    <th key={i} style={{ textAlign: "center", padding: "8px 4px", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: "11px" }}>
                      {i + 1}
                    </th>
                  ))}
                  <th style={{ textAlign: "center", padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: "11px" }}>
                    Done
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map(([userId, info]) => {
                  const doneCount = info.steps.filter(Boolean).length;
                  return (
                    <tr key={userId}>
                      <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>
                        {info.username}
                      </td>
                      {info.steps.map((done, i) => (
                        <td key={i} style={{ textAlign: "center", padding: "8px 4px", borderBottom: "1px solid var(--border)" }}>
                          {done ? (
                            <CheckCircle2 size={14} style={{ color: "#22c55e" }} />
                          ) : (
                            <Circle size={14} style={{ color: "rgba(255,255,255,0.15)" }} />
                          )}
                        </td>
                      ))}
                      <td style={{ textAlign: "center", padding: "8px 10px", borderBottom: "1px solid var(--border)", fontWeight: 700 }}>
                        {doneCount}/{STEP_COUNT}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedSession && students.length === 0 && !loading && (
        <p style={{ color: "var(--muted)", fontSize: "13px", textAlign: "center", padding: "40px" }}>
          No students have completed any steps yet in this session.
        </p>
      )}
    </div>
  );
}
