"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import EQRoom from "@/components/EQRoom";
import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";
import ProfileDropdown from "@/components/ProfileDropdown";
import PageLogo from "@/components/PageLogo";
import type { SongListItem, SoundClass } from "@/lib/types";

export default function RoomPage() {
  const params = useParams<{ songId: string }>();
  const router = useRouter();
  const songId = params.songId;

  const [song, setSong] = useState<SongListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/songs/${songId}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Audio track not found");
          throw new Error("Failed to load track details");
        }
        return res.json() as Promise<SongListItem>;
      })
      .then((data) => {
        setSong(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error loading track details");
      })
      .finally(() => setLoading(false));
  }, [songId]);

  if (loading) {
    return (
      <div className="container mx-auto min-h-screen">
        <div className="dashboard-loading">
          <div className="loading-spinner" />
          <p>Calibrating Web Audio Pipeline...</p>
        </div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="container mx-auto min-h-screen with-sidebar" style={{ paddingTop: "48px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#f87171", marginBottom: "8px" }}>Error</h2>
        <p style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "24px" }}>
          {error || "Could not retrieve track info"}
        </p>
        <Link href="/dashboard" className="back-link">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto min-h-screen room-page">
      <header className="header header-with-profile header-desktop-row">
        <PageLogo page="console" />
        <div className="header-desktop-nav">
          <DesktopNav />
        </div>
        <ProfileDropdown />
      </header>

      <main>
        <EQRoom
          songId={song.id}
          songTitle={song.title}
          songArtist={song.artist}
          songAlbum={song.album}
          songGenre={song.genre}
          songCoverImage={song.cover_image ?? null}
          songBpm={song.bpm ?? null}
          songKey={song.musical_key ?? null}
          songUrl={song.file_url.startsWith("http")
            ? `/api/audio-proxy?url=${encodeURIComponent(song.file_url)}`
            : song.file_url}
          uploadType={(song.upload_type as SoundClass) ?? "music"}
          onSessionSaved={() => {
            setTimeout(() => {
              router.push("/dashboard");
            }, 1500);
          }}
        />
      </main>

      <BottomNav />
    </div>
  );
}
