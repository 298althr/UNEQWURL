"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

type ToastProps = {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
};

export default function Toast({ message, type = "info", duration = 4000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const enter = setTimeout(() => setVisible(true), 50);
    const exit = setTimeout(() => setVisible(false), duration);
    const cleanup = setTimeout(() => onClose?.(), duration + 300);
    return () => {
      clearTimeout(enter);
      clearTimeout(exit);
      clearTimeout(cleanup);
    };
  }, [duration, onClose]);

  const bg =
    type === "success"
      ? "rgba(34, 197, 94, 0.95)"
      : type === "error"
      ? "rgba(239, 68, 68, 0.95)"
      : "rgba(59, 130, 246, 0.95)";

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: visible ? "translate(-50%, 0)" : "translate(-50%, -20px)",
        opacity: visible ? 1 : 0,
        transition: "all 0.3s ease",
        zIndex: 9999,
        background: bg,
        color: "#fff",
        padding: "12px 24px",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: 600,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        pointerEvents: "none",
        maxWidth: "90vw",
        textAlign: "center",
        wordBreak: "break-word",
      }}
    >
      {type === "success" && <CheckCircle size={18} style={{ marginRight: "8px", flexShrink: 0 }} />}
      {type === "error" && <XCircle size={18} style={{ marginRight: "8px", flexShrink: 0 }} />}
      {type === "info" && <Info size={18} style={{ marginRight: "8px", flexShrink: 0 }} />}
      {message}
    </div>
  );
}
