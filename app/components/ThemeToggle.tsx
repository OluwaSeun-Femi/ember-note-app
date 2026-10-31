"use client";

import { useEffect, useState } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "./Icons";

export type Theme = "light" | "dark" | "system";
export const THEME_KEY = "ember-theme";

const OPTIONS: { id: Theme; label: string; Icon: typeof SunIcon }[] = [
  { id: "light", label: "Light", Icon: SunIcon },
  { id: "dark", label: "Dark", Icon: MoonIcon },
  { id: "system", label: "System", Icon: MonitorIcon },
];

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
  window.dispatchEvent(new CustomEvent("ember-theme", { detail: theme }));
}

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const read = () => {
      const t = document.documentElement.dataset.theme;
      setTheme(t === "dark" || t === "system" ? t : "light");
    };
    read();
    window.addEventListener("ember-theme", read);
    return () => window.removeEventListener("ember-theme", read);
  }, []);
  return [theme, applyTheme];
}

/** Light / Dark / System. `compact` shows a single button that cycles through them. */
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useTheme();

  if (compact) {
    const index = OPTIONS.findIndex((o) => o.id === theme);
    const current = OPTIONS[index];
    const next = OPTIONS[(index + 1) % OPTIONS.length];
    return (
      <button
        type="button"
        onClick={() => setTheme(next.id)}
        aria-label={`Theme: ${current.label}. Switch to ${next.label}`}
        title={`Theme: ${current.label}`}
        className="grid size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-sunken hover:text-ink"
      >
        <current.Icon />
      </button>
    );
  }

  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-xl bg-sunken p-1">
      {OPTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={theme === id}
          onClick={() => setTheme(id)}
          title={label}
          className={`flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors ${
            theme === id ? "bg-surface text-ink shadow-[var(--shadow)]" : "text-muted hover:text-ink"
          }`}
        >
          <Icon size={15} />
          {label}
        </button>
      ))}
    </div>
  );
}
