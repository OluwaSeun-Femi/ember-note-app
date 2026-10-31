"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Note, NoteColor } from "./actions";
import NoteCard from "./components/NoteCard";
import NoteEditor from "./components/NoteEditor";
import ConfirmDialog from "./components/ConfirmDialog";
import ThemeToggle from "./components/ThemeToggle";
import { CloseIcon, FlameIcon, NotesIcon, PinIcon, PlusIcon, SearchIcon } from "./components/Icons";
import { STORAGE_KEY, loadNotes, matchesSearch, saveNotes, tagColor, tagCounts } from "./lib/notes";

type View = { type: "all" } | { type: "pinned" } | { type: "tag"; tag: string };
type Editing = { mode: "new" } | { mode: "edit"; id: string } | null;
type Toast = { id: number; message: string; undo?: () => void };

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>({ type: "all" });
  const [editing, setEditing] = useState<Editing>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const toastSeq = useRef(0);

  const showToast = useCallback((message: string, undo?: () => void) => {
    setToast({ id: ++toastSeq.current, message, undo });
  }, []);

  // 1. Read saved notes after the first render (localStorage only exists in the browser).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading from localStorage once on mount
    setNotes(loadNotes());
    setLoaded(true);
  }, []);

  // 2. Save whenever notes change, but only after they've loaded, so we never overwrite them with [].
  useEffect(() => {
    if (loaded) saveNotes(notes);
  }, [notes, loaded]);

  // Keep in sync with other tabs.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) setNotes(loadNotes());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Shortcuts: "/" search, "n" new note.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing || confirmId || e.metaKey || e.ctrlKey || e.altKey) return;
      const typing = (e.target as HTMLElement).closest("input, textarea, [contenteditable=true]");
      if (typing) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setEditing({ mode: "new" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, confirmId]);

  // Toasts disappear on their own.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.undo ? 6000 : 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const tags = useMemo(() => tagCounts(notes), [notes]);
  const pinnedCount = notes.filter((n) => n.pinned).length;

  // If the chosen tag disappears (its last note was deleted), fall back to All.
  const activeView: View = useMemo(
    () => (view.type === "tag" && !tags.some((t) => t.tag === view.tag) ? { type: "all" } : view),
    [view, tags],
  );
  const activeTag = activeView.type === "tag" ? activeView.tag : null;

  const visible = useMemo(() => {
    return notes
      .filter((n) => {
        if (activeView.type === "pinned" && !n.pinned) return false;
        if (activeView.type === "tag" && !n.tags.includes(activeView.tag)) return false;
        return matchesSearch(n, query);
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, activeView, query]);

  const pinned = visible.filter((n) => n.pinned);
  const others = visible.filter((n) => !n.pinned);
  const editingNote = editing?.mode === "edit" ? notes.find((n) => n.id === editing.id) : undefined;

  // ---------- Actions ----------

  function handleSave(note: Note, isNew: boolean) {
    setNotes((current) => (isNew ? [note, ...current] : current.map((n) => (n.id === note.id ? note : n))));
    setEditing(null);
    showToast(isNew ? "Note saved" : "Changes saved");
  }

  function patchNote(id: string, patch: (n: Note) => Partial<Note>) {
    setNotes((current) => current.map((n) => (n.id === id ? { ...n, ...patch(n) } : n)));
  }

  function togglePin(id: string) {
    const note = notes.find((n) => n.id === id);
    patchNote(id, (n) => ({ pinned: !n.pinned }));
    if (note) showToast(note.pinned ? "Unpinned" : "Pinned to top");
  }

  function toggleItem(noteId: string, itemId: string) {
    patchNote(noteId, (n) => ({
      items: n.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)),
      updatedAt: Date.now(),
    }));
  }

  function setColor(id: string, color: NoteColor) {
    patchNote(id, () => ({ color }));
  }

  /** Deleting always asks first. */
  function requestDelete(id: string) {
    setConfirmId(id);
  }

  function handleDelete(id: string) {
    setConfirmId(null);
    const index = notes.findIndex((n) => n.id === id);
    if (index === -1) return;
    const removed = notes[index];
    setNotes((current) => current.filter((n) => n.id !== id));
    setEditing(null);
    showToast(`Deleted “${removed.title}”`, () =>
      setNotes((current) => {
        if (current.some((n) => n.id === removed.id)) return current;
        const next = [...current];
        next.splice(Math.min(index, next.length), 0, removed);
        return next;
      }),
    );
  }

  function chooseTag(tag: string) {
    setView((v) => (v.type === "tag" && v.tag === tag ? { type: "all" } : { type: "tag", tag }));
  }

  const closeEditor = useCallback(() => setEditing(null), []);
  const cancelDelete = useCallback(() => setConfirmId(null), []);
  const confirmNote = confirmId ? notes.find((n) => n.id === confirmId) : undefined;

  // ---------- Render helpers ----------

  const viewTitle = activeView.type === "all" ? "All notes" : activeView.type === "pinned" ? "Pinned" : activeView.tag;
  const filtering = Boolean(query.trim());

  function renderGrid(list: Note[]) {
    return (
      <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
        {list.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            query={query}
            activeTag={activeTag}
            onOpen={() => setEditing({ mode: "edit", id: note.id })}
            onTogglePin={() => togglePin(note.id)}
            onToggleItem={(itemId) => toggleItem(note.id, itemId)}
            onColor={(color) => setColor(note.id, color)}
            onDelete={() => requestDelete(note.id)}
            onTag={chooseTag}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      {/* ---------- Sidebar (laptop) ---------- */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface/60 px-3 py-5 lg:flex">
        <Brand className="px-2" />
        <button
          type="button"
          onClick={() => setEditing({ mode: "new" })}
          className="mt-6 flex h-11 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-white shadow-[var(--shadow)] transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.98]"
        >
          <PlusIcon />
          New note
          <kbd className="ml-1 rounded border border-white/30 px-1.5 text-[11px] font-medium text-white/80">N</kbd>
        </button>

        <nav aria-label="Notes" className="mt-6 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          <SideLink active={activeView.type === "all"} onClick={() => setView({ type: "all" })} icon={<NotesIcon />} label="All notes" count={notes.length} />
          <SideLink active={activeView.type === "pinned"} onClick={() => setView({ type: "pinned" })} icon={<PinIcon />} label="Pinned" count={pinnedCount} />

          {tags.length > 0 && <p className="mb-1 mt-5 px-3 text-xs font-semibold text-muted">Tags</p>}
          {tags.map(({ tag, count }) => (
            <SideLink
              key={tag}
              active={activeTag === tag}
              onClick={() => chooseTag(tag)}
              icon={
                <span className="grid size-[18px] place-items-center">
                  <span className="block size-2 rounded-full" style={{ background: tagColor(tag) }} />
                </span>
              }
              label={tag}
              count={count}
            />
          ))}
        </nav>

        <div className="mt-4">
          <ThemeToggle />
        </div>
      </aside>

      {/* ---------- Main ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md lg:border-transparent">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pb-3 pt-3 sm:px-6 lg:px-8 lg:pt-5">
            <Brand className="lg:hidden" />
            <div className="ml-auto lg:hidden">
              <ThemeToggle compact />
            </div>
            <div role="search" className="relative w-full max-lg:hidden lg:max-w-xl">
              <SearchBox inputRef={searchRef} query={query} setQuery={setQuery} />
            </div>
          </div>
          <div className="px-4 pb-3 sm:px-6 lg:hidden">
            <div role="search" className="relative">
              <SearchBox inputRef={searchRef} query={query} setQuery={setQuery} mobile />
            </div>
          </div>
        </header>

        {/* Filter chips (phone + tablet) */}
        {loaded && notes.length > 0 && (
          <nav aria-label="Filter notes" className="lg:hidden">
            <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-3 sm:px-6">
              <li>
                <Chip active={activeView.type === "all"} onClick={() => setView({ type: "all" })} label="All" count={notes.length} />
              </li>
              {pinnedCount > 0 && (
                <li>
                  <Chip active={activeView.type === "pinned"} onClick={() => setView({ type: "pinned" })} label="Pinned" count={pinnedCount} icon={<PinIcon size={14} />} />
                </li>
              )}
              {tags.map(({ tag, count }) => (
                <li key={tag}>
                  <Chip
                    active={activeTag === tag}
                    onClick={() => chooseTag(tag)}
                    label={tag}
                    count={count}
                    icon={<span className="size-2 rounded-full" style={{ background: tagColor(tag) }} />}
                  />
                </li>
              ))}
            </ul>
          </nav>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-4">
          {loaded && notes.length > 0 && (
            <div className="mb-5 flex items-baseline gap-3">
              <h1 className="text-2xl font-bold tracking-tight first-letter:uppercase">{viewTitle}</h1>
              <p className="text-sm text-muted" aria-live="polite">
                {filtering ? `${visible.length} found` : `${visible.length} ${visible.length === 1 ? "note" : "notes"}`}
              </p>
            </div>
          )}

          {!loaded ? (
            <div className="columns-1 gap-4 sm:columns-2 xl:columns-3" aria-hidden="true">
              {[140, 200, 120].map((h, i) => (
                <div key={i} className="mb-4 animate-pulse rounded-2xl bg-line/60" style={{ height: h }} />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <EmptyState
              icon={<NotesIcon size={28} />}
              title="No notes yet"
              text="Write down a shopping list, sermon points or an idea for later. Notes stay on this device."
              action={
                <button
                  type="button"
                  onClick={() => setEditing({ mode: "new" })}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 font-semibold text-white hover:bg-accent-hover"
                >
                  <PlusIcon />
                  Write your first note
                </button>
              }
            />
          ) : visible.length === 0 ? (
            filtering ? (
              <EmptyState
                icon={<SearchIcon size={28} />}
                title="No notes match"
                text={`Nothing has “${query.trim()}” in its title or text${activeView.type !== "all" ? ` in ${viewTitle}` : ""}.`}
                action={
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setView({ type: "all" });
                    }}
                    className="h-10 rounded-xl border border-line bg-surface px-4 text-sm font-semibold hover:border-ink/20"
                  >
                    Clear search
                  </button>
                }
              />
            ) : (
              <EmptyState icon={<PinIcon size={28} />} title="No pinned notes" text="Pin a note to keep it at the top." />
            )
          ) : (
            <>
              {pinned.length > 0 && others.length > 0 && activeView.type !== "pinned" ? (
                <>
                  <SectionLabel icon={<PinIcon size={14} />} label="Pinned" />
                  {renderGrid(pinned)}
                  <SectionLabel label="Others" />
                  {renderGrid(others)}
                </>
              ) : (
                renderGrid(visible)
              )}
            </>
          )}
        </main>
      </div>

      {/* New note button (phone + tablet) */}
      <button
        type="button"
        onClick={() => setEditing({ mode: "new" })}
        aria-label="New note"
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-30 grid size-14 place-items-center rounded-2xl bg-accent text-white shadow-[0_8px_24px_rgba(232,89,12,0.35)] transition-[background-color,transform] hover:bg-accent-hover active:scale-95 lg:hidden"
      >
        <PlusIcon size={24} />
      </button>

      {editing && (
        <NoteEditor
          key={editing.mode === "edit" ? editing.id : "new"}
          note={editingNote}
          existingTags={tags.map((t) => t.tag)}
          onSave={handleSave}
          onDelete={requestDelete}
          onClose={closeEditor}
        />
      )}

      {confirmNote && (
        <ConfirmDialog
          title="Delete this note?"
          message={`“${confirmNote.title}” will be removed from this device.`}
          confirmLabel="Delete"
          onConfirm={() => handleDelete(confirmNote.id)}
          onCancel={cancelDelete}
        />
      )}

      {/* Toast */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-6"
        aria-live="polite"
      >
        {toast && !editing && (
          <div key={toast.id} role="status" className="anim-pop pointer-events-auto flex items-center gap-2 rounded-xl bg-ink py-2.5 pl-4 pr-2 text-sm text-surface shadow-[var(--shadow-lg)]">
            <span className="pr-2">{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                  showToast("Note restored");
                }}
                className="rounded-lg px-2.5 py-1 font-semibold text-accent hover:bg-white/10"
              >
                Undo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Small pieces ----------

function Brand({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="grid size-9 place-items-center rounded-xl bg-accent text-white shadow-[0_4px_12px_rgba(232,89,12,0.3)]">
        <FlameIcon size={20} />
      </span>
      <span className="text-xl font-extrabold tracking-tight">Ember</span>
    </div>
  );
}

function SearchBox({
  inputRef,
  query,
  setQuery,
  mobile = false,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  query: string;
  setQuery: (q: string) => void;
  mobile?: boolean;
}) {
  const id = mobile ? "search-mobile" : "search";
  return (
    <>
      <label htmlFor={id} className="sr-only">
        Search notes
      </label>
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
      <input
        id={id}
        ref={mobile ? undefined : inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setQuery("");
            e.currentTarget.blur();
          }
        }}
        placeholder="Search notes"
        autoComplete="off"
        enterKeyHint="search"
        className="h-11 w-full rounded-xl border border-line bg-surface pl-11 pr-10 text-base text-ink shadow-[var(--shadow)] outline-none transition-[border-color,box-shadow] placeholder:text-muted/80 focus:border-accent focus:ring-3 focus:ring-accent/15 [&::-webkit-search-cancel-button]:hidden"
      />
      {query ? (
        <button
          type="button"
          onClick={() => setQuery("")}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
        >
          <CloseIcon size={16} />
        </button>
      ) : (
        !mobile && (
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-line px-1.5 text-xs text-muted">
            /
          </kbd>
        )
      )}
    </>
  );
}

function SideLink({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: ReactNode; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors ${
        active ? "bg-accent-soft font-semibold text-ink" : "text-ink/80 hover:bg-sunken"
      }`}
    >
      <span className={active ? "text-accent" : "text-muted"}>{icon}</span>
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      <span className="text-xs tabular-nums text-muted">{count}</span>
    </button>
  );
}

function Chip({ active, onClick, label, count, icon }: { active: boolean; onClick: () => void; label: string; count: number; icon?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors active:scale-[0.97] ${
        active ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink"
      }`}
    >
      {icon}
      {label}
      <span className={`tabular-nums ${active ? "text-surface/70" : "text-muted"}`}>{count}</span>
    </button>
  );
}

function SectionLabel({ label, icon }: { label: string; icon?: ReactNode }) {
  return (
    <h2 className="mb-3 mt-2 flex items-center gap-1.5 text-sm font-semibold text-muted first:mt-0 [&:not(:first-child)]:mt-4">
      {icon}
      {label}
    </h2>
  );
}

function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="anim-pop mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-accent-soft text-accent">{icon}</span>
      <p className="mt-5 text-lg font-bold">{title}</p>
      <p className="mt-1.5 text-muted">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
