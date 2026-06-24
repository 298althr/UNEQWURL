"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SongsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return (
    <div className="container mx-auto min-h-screen flex items-center justify-center">
      <p className="text-muted">Redirecting...</p>
    </div>
  );
}

