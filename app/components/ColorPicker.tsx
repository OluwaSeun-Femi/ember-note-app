"use client";

import { useEffect, useRef, useState } from "react";
import type { NoteColor } from "../actions";
import { NOTE_COLORS, noteBackground } from "../lib/notes";
import { CheckIcon, PaletteIcon } from "./Icons";

type Props = {
  value: NoteColor;
  onChange: (color: NoteColor) => void;
  /** Which way the swatch panel opens. */
  align?: "left" | "right";
  placement?: "top" | "bottom";
  buttonClassName?: string;
};

/** A palette button that opens a small row of colour swatches. */
export default function ColorPicker({ value, onChange, align = "left", placement = "top", buttonClassName = "" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Note colour"
        aria-expanded={open}
        title="Colour"
        className={`grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink ${buttonClassName}`}
      >
        <PaletteIcon />
      </button>
      {open && (
        <div
          role="radiogroup"
          aria-label="Note colour"
          className={`anim-pop absolute z-30 flex gap-1.5 rounded-xl border border-line bg-surface p-2 shadow-[var(--shadow-lg)] ${
            align === "left" ? "left-0" : "right-0"
          } ${placement === "top" ? "bottom-full mb-2" : "top-full mt-2"}`}
        >
          {NOTE_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={value === c.id}
              aria-label={c.label}
              title={c.label}
              onClick={() => {
                onChange(c.id);
                setOpen(false);
              }}
              className={`grid size-8 place-items-center rounded-full border transition-transform hover:scale-110 ${
                value === c.id ? "border-ink" : "border-line"
              }`}
              style={{ background: noteBackground(c.id) }}
            >
              {value === c.id && <CheckIcon size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
