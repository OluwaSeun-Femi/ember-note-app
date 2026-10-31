"use server";

export type NoteColor = "default" | "sand" | "mint" | "sky" | "lilac" | "rose";

export type ChecklistItem = { id: string; text: string; done: boolean };

export type Note = {
  id: string;
  title: string;
  /** Plain text. Used when kind is "text". */
  body: string;
  /** Used when kind is "list". */
  items: ChecklistItem[];
  kind: "text" | "list";
  tags: string[];
  color: NoteColor;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};

export type NoteField = "title" | "body";

export type CheckNoteResult = { error: string; fields: NoteField[] } | { note: Note };

const COLORS: NoteColor[] = ["default", "sand", "mint", "sky", "lilac", "rose"];

function cleanItems(raw: string): ChecklistItem[] {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, i) => ({
        id: typeof item?.id === "string" && item.id ? item.id.slice(0, 40) : `item-${i}`,
        text: String(item?.text ?? "").trim().slice(0, 500),
        done: Boolean(item?.done),
      }))
      .filter((item) => item.text.length > 0)
      .slice(0, 200);
  } catch {
    return [];
  }
}

/**
 * Checks every note before it's kept.
 * - Rejects an empty title, or a note with nothing in it, and says which is missing.
 * - Cleans the tags: trims spaces, lowercases, removes duplicates and blanks,
 *   so "Work, work , Church," becomes ["work", "church"].
 */
export async function checkNote(formData: FormData): Promise<CheckNoteResult> {
  const title = String(formData.get("title") ?? "").trim();
  const kind = formData.get("kind") === "list" ? "list" : "text";
  const body = kind === "text" ? String(formData.get("body") ?? "").trim() : "";
  const items = kind === "list" ? cleanItems(String(formData.get("items") ?? "")) : [];
  const rawTags = String(formData.get("tags") ?? "");

  const hasContent = kind === "text" ? body.length > 0 : items.length > 0;
  const contentMessage = kind === "text" ? "some text" : "at least one item";

  if (!title && !hasContent) {
    return { error: `Add a title and ${contentMessage} to save this note.`, fields: ["title", "body"] };
  }
  if (!title) {
    return { error: "Add a title to save this note.", fields: ["title"] };
  }
  if (!hasContent) {
    return { error: `Add ${contentMessage} to save this note.`, fields: ["body"] };
  }

  const tags = Array.from(
    new Set(
      rawTags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0),
    ),
  );

  const color = String(formData.get("color") ?? "default") as NoteColor;
  const existingId = String(formData.get("id") ?? "");
  const createdAt = Number(formData.get("createdAt"));
  const now = Date.now();

  return {
    note: {
      id: /^[\w-]{6,64}$/.test(existingId) ? existingId : crypto.randomUUID(),
      title: title.slice(0, 200),
      body,
      items,
      kind,
      tags,
      color: COLORS.includes(color) ? color : "default",
      pinned: formData.get("pinned") === "true",
      createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : now,
      updatedAt: now,
    },
  };
}
