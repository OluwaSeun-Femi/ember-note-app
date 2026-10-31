"use client";

import { useEffect, useRef } from "react";
import { TrashIcon } from "./Icons";

type Props = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Asks before something destructive. Cancel has focus, so Enter can't delete by accident. */
export default function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Capture phase so Escape closes only this dialog, not the note editor underneath.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      } else if (e.key === "Tab") {
        // Keep focus inside the two buttons.
        const first = cancelRef.current;
        const last = confirmRef.current;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <div className="anim-fade absolute inset-0 bg-[#0d1117]/45 backdrop-blur-[2px]" onClick={onCancel} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="anim-sheet relative w-full max-w-sm rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-lg)] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6"
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger">
          <TrashIcon size={22} />
        </span>
        <h2 id="confirm-title" className="mt-4 text-lg font-bold tracking-tight">
          {title}
        </h2>
        <p id="confirm-message" className="mt-1.5 break-words text-[15px] text-muted">
          {message}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="h-11 rounded-xl border border-line bg-surface font-semibold text-ink transition-colors hover:bg-sunken"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="h-11 rounded-xl bg-danger font-semibold text-white transition-[filter,transform] hover:brightness-110 active:scale-[0.97]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
