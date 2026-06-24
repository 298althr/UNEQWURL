"use client";

import { useEffect } from "react";

export default function ConfirmationModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  confirmVariant = "danger",
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmVariant?: "danger" | "primary";
}) {
  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    if (open) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div
        className="confirm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn btn-${confirmVariant}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
