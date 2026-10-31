import type { ChecklistItem, Note, NoteColor } from "../actions";

export const STORAGE_KEY = "ember-notes";
const OLD_STORAGE_KEY = "ignis-notes";

export const NOTE_COLORS: { id: NoteColor; label: string }[] = [
  { id: "default", label: "No colour" },
  { id: "sand", label: "Sand" },
  { id: "mint", label: "Mint" },
  { id: "sky", label: "Sky" },
  { id: "lilac", label: "Lilac" },
  { id: "rose", label: "Rose" },
];

export function noteBackground(color: NoteColor): string {
  return color === "default" ? "var(--surface)" : `var(--note-${color})`;
}

/** Short random id for checklist items (works on http:// too, unlike crypto.randomUUID). */
export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

/** Turns anything read from storage into a valid Note, filling in fields older notes don't have. */
function normalize(raw: unknown): Note | null {
  if (typeof raw !== "object" || raw === null) return null;
  const n = raw as Partial<Note>;
  if (typeof n.id !== "string" || typeof n.title !== "string") return null;
  const items: ChecklistItem[] = Array.isArray(n.items)
    ? n.items
        .filter((i) => i && typeof i.text === "string")
        .map((i) => ({ id: String(i.id || uid()), text: i.text, done: Boolean(i.done) }))
    : [];
  const created = typeof n.createdAt === "number" ? n.createdAt : Date.now();
  return {
    id: n.id,
    title: n.title,
    body: typeof n.body === "string" ? n.body : "",
    items,
    kind: n.kind === "list" ? "list" : "text",
    tags: Array.isArray(n.tags) ? n.tags.filter((t): t is string => typeof t === "string") : [],
    color: NOTE_COLORS.some((c) => c.id === n.color) ? (n.color as NoteColor) : "default",
    pinned: Boolean(n.pinned),
    createdAt: created,
    updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : created,
  };
}

/** Reads notes from localStorage. Only call this in the browser (inside useEffect). */
export function loadNotes(): Note[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(OLD_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalize).filter((n): n is Note => n !== null);
  } catch {
    return [];
  }
}

export function saveNotes(notes: Note[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Storage full or blocked (private mode). Notes stay in memory for this visit.
  }
}

/** All the words in a note's content, for search. */
export function noteText(note: Note): string {
  return note.kind === "list" ? note.items.map((i) => i.text).join("\n") : note.body;
}

/** Search matches words in the title or the note itself (case-insensitive). */
export function matchesSearch(note: Note, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = `${note.title}\n${noteText(note)}`.toLowerCase();
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

/** All tags across notes, with how many notes use each, most used first. */
export function tagCounts(notes: Note[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const tag of note.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

const TAG_HUES = ["#2F6FEB", "#2B9A66", "#9C4DD8", "#D6336C", "#0C8599", "#C08A00", "#5C7CFA", "#E8890C"];

/** A stable colour for each tag name, so "work" always looks the same. */
export function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  return TAG_HUES[hash % TAG_HUES.length];
}

export function formatDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)} min ago`;
  if (diff < day) return `${Math.floor(diff / hour)} h ago`;
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: new Date(timestamp).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}
