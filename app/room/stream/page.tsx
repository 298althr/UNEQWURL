"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import EQRoom from "@/components/EQRoom";
import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";
import ProfileDropdown from "@/components/ProfileDropdown";
import PageLogo from "@/components/PageLogo";
import type { SoundClass } from "@/lib/types";

function StreamRoomContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawStreamUrl = searchParams.get("url");
  const uploadType = (searchParams.get("type") as SoundClass) || "music";
  const title = searchParams.get("title") || "YouTube Stream";
  const artist = searchParams.get("artist") || "Unknown";
  const originalYoutubeUrl = searchParams.get("youtubeUrl") || null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!rawStreamUrl) {
      setError("No stream URL provided. Paste a YouTube URL on the dashboard to start mixing.");
      setLoading(false);
      return;
    }

    // Build proxy URL through our server to avoid CORS
    const proxy = `/api/youtube/proxy?url=${encodeURIComponent(rawStreamUrl)}`;
    setProxyUrl(proxy);
    setLoading(false);
  }, [rawStreamUrl]);

  if (loading) {
    return (
      <div className="container mx-auto min-h-screen">
        <div className="dashboard-loading">
          <div className="loading-spinner" />
          <p>Connecting to YouTube stream...</p>
        </div>
      </div>
    );
  }

  if (error || !proxyUrl) {
    return (
      <div className="container mx-auto min-h-screen with-sidebar" style={{ paddingTop: "48px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#f87171", marginBottom: "8px" }}>Error</h2>
        <p style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "24px" }}>
          {error || "Could not start stream"}
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
          songId="live-stream"
          songTitle={title}
          songArtist={artist}
          songAlbum={null}
          songGenre={null}
          songUrl={proxyUrl}
          uploadType={uploadType}
          youtubeUrl={originalYoutubeUrl}
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

export default function StreamRoomPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto min-h-screen">
        <div className="dashboard-loading">
          <div className="loading-spinner" />
          <p>Loading stream room...</p>
        </div>
      </div>
    }>
      <StreamRoomContent />
    </Suspense>
  );
}
