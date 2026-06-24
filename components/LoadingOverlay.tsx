"use client";

import { useEffect, useState } from "react";

export default function LoadingOverlay({
  visible,
  message = "Loading...",
}: {
  visible: boolean;
  message?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={`loading-overlay${visible ? "" : " hidden"}`}>
      <div className="loading-spinner" />
      <p>{message}</p>
    </div>
  );
}
