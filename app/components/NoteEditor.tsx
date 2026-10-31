"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { checkNote, type ChecklistItem, type Note, type NoteColor, type NoteField } from "../actions";
import { formatDate, noteBackground, uid } from "../lib/notes";
import ColorPicker from "./ColorPicker";
import TagInput from "./TagInput";
import {
  ArrowLeftIcon,
  CheckSquareIcon,
  CloseIcon,
  ListChecksIcon,
  PinIcon,
  PlusIcon,
  SquareIcon,
  TextIcon,
  TrashIcon,
} from "./Icons";

type Props = {
  /** The note being edited, or undefined for a new note. */
  note?: Note;
  existingTags: string[];
  onSave: (note: Note, isNew: boolean) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

type Draft = {
  title: string;
  body: string;
  kind: "text" | "list";
  items: ChecklistItem[];
  tags: string[];
  color: NoteColor;
  pinned: boolean;
};

function toDraft(note?: Note): Draft {
  return {
    title: note?.title ?? "",
    body: note?.body ?? "",
    kind: note?.kind ?? "text",
    items: note?.items.length ? note.items : [{ id: uid(), text: "", done: false }],
    tags: note?.tags ?? [],
    color: note?.color ?? "default",
    pinned: note?.pinned ?? false,
  };
}

/** Compare only what the person can change, ignoring empty checklist rows. */
function fingerprint(d: Draft, tagDraft: string) {
  return JSON.stringify({
    ...d,
    title: d.title.trim(),
    body: d.kind === "text" ? d.body.trim() : "",
    items: d.kind === "list" ? d.items.filter((i) => i.text.trim()).map((i) => [i.text.trim(), i.done]) : [],
    tagDraft: tagDraft.trim(),
  });
}

export default function NoteEditor({ note, existingTags, onSave, onDelete, onClose }: Props) {
  const isNew = !note;
  const [initial] = useState(() => toDraft(note));
  const [draft, setDraft] = useState<Draft>(initial);
  const [tagDraft, setTagDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [badFields, setBadFields] = useState<NoteField[]>([]);
  const [saving, setSaving] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const itemRefs = useRef(new Map<string, HTMLInputElement>());
  const pendingFocus = useRef<string | null>(null);

  const dirty = fingerprint(draft, tagDraft) !== fingerprint(initial, "");
  const isBlank =
    !draft.title.trim() &&
    !draft.body.trim() &&
    !draft.items.some((i) => i.text.trim()) &&
    draft.tags.length === 0 &&
    !tagDraft.trim();

  function update(patch: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function clearError(field: NoteField) {
    if (!badFields.includes(field)) return;
    const rest = badFields.filter((f) => f !== field);
    setBadFields(rest);
    if (rest.length === 0) setError(null);
  }

  function shake() {
    const el = panelRef.current;
    if (!el) return;
    el.classList.remove("anim-shake");
    void el.offsetWidth;
    el.classList.add("anim-shake");
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const formData = new FormData();
      if (note) {
        formData.set("id", note.id);
        formData.set("createdAt", String(note.createdAt));
      }
      formData.set("title", draft.title);
      formData.set("kind", draft.kind);
      formData.set("body", draft.body);
      formData.set("items", JSON.stringify(draft.items));
      formData.set("tags", [...draft.tags, tagDraft].join(","));
      formData.set("color", draft.color);
      formData.set("pinned", String(draft.pinned));

      const result = await checkNote(formData);
      if ("error" in result) {
        setError(result.error);
        setBadFields(result.fields);
        shake();
        if (result.fields[0] === "title") titleRef.current?.focus();
        else if (draft.kind === "text") bodyRef.current?.focus();
        else itemRefs.current.get(draft.items[0]?.id)?.focus();
        return;
      }
      onSave(result.note, isNew);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      shake();
    } finally {
      setSaving(false);
    }
  }

  /** Closing keeps changes, like a paper notebook. Nothing typed? Just close. */
  function requestClose() {
    if (!dirty || (isNew && isBlank)) onClose();
    else void save();
  }

  // Latest close handler for the Escape key.
  const closeRef = useRef(requestClose);
  useEffect(() => {
    closeRef.current = requestClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (isNew) titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [isNew]);

  // Grow the text box with its content.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 160)}px`;
  }, [draft.body, draft.kind]);

  // Move focus to a checklist row after adding/removing one.
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    const el = itemRefs.current.get(id);
    if (el) {
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
    }
  });

  function switchKind() {
    if (draft.kind === "text") {
      const lines = draft.body.split("\n").map((l) => l.replace(/^\s*([-*•]|\d+[.)])\s+/, "").trim()).filter(Boolean);
      const items = lines.length ? lines.map((text) => ({ id: uid(), text, done: false })) : [{ id: uid(), text: "", done: false }];
      update({ kind: "list", items });
      pendingFocus.current = items[items.length - 1].id;
    } else {
      update({ kind: "text", body: draft.items.map((i) => i.text).filter((t) => t.trim()).join("\n") });
      requestAnimationFrame(() => bodyRef.current?.focus());
    }
    clearError("body");
  }

  function setItem(id: string, patch: Partial<ChecklistItem>) {
    update({ items: draft.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  }

  function addItemAfter(id: string | null) {
    const item = { id: uid(), text: "", done: false };
    const index = id ? draft.items.findIndex((i) => i.id === id) + 1 : draft.items.length;
    const items = [...draft.items];
    items.splice(index, 0, item);
    update({ items });
    pendingFocus.current = item.id;
  }

  function removeItem(id: string, focusPrevious = false) {
    const index = draft.items.findIndex((i) => i.id === id);
    const items = draft.items.filter((i) => i.id !== id);
    const safe = items.length ? items : [{ id: uid(), text: "", done: false }];
    update({ items: safe });
    if (focusPrevious) pendingFocus.current = safe[Math.max(0, index - 1)].id;
  }

  const doneCount = draft.items.filter((i) => i.done && i.text.trim()).length;
  const itemCount = draft.items.filter((i) => i.text.trim()).length;

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-center sm:items-center sm:p-6">
      <div className="anim-fade absolute inset-0 bg-[#0d1117]/40 backdrop-blur-[2px]" onClick={requestClose} aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? "New note" : `Edit note: ${note?.title}`}
        className="anim-sheet relative flex w-full flex-col overflow-hidden bg-surface shadow-[var(--shadow-lg)] transition-[background-color] duration-300 sm:max-h-[86dvh] sm:max-w-2xl sm:rounded-3xl sm:border sm:border-line"
        style={{ background: noteBackground(draft.color) }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void save();
          }
        }}
      >
        {/* Top bar */}
        <div className="flex items-center gap-1 px-2 pb-1 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-3 sm:pt-3">
          <button
            type="button"
            onClick={requestClose}
            aria-label={dirty ? "Save and close" : "Close"}
            title={dirty ? "Save and close" : "Close"}
            className="grid size-10 place-items-center rounded-xl text-muted hover:bg-ink/[0.06] hover:text-ink"
          >
            <ArrowLeftIcon className="sm:hidden" />
            <CloseIcon className="max-sm:hidden" />
          </button>
          <span className="ml-1 text-sm text-muted">
            {isNew ? "New note" : `Edited ${formatDate(note!.updatedAt).toLowerCase()}`}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => update({ pinned: !draft.pinned })}
              aria-pressed={draft.pinned}
              aria-label={draft.pinned ? "Unpin" : "Pin to top"}
              title={draft.pinned ? "Unpin" : "Pin to top"}
              className={`grid size-10 place-items-center rounded-xl hover:bg-ink/[0.06] ${draft.pinned ? "text-accent" : "text-muted hover:text-ink"}`}
            >
              <PinIcon filled={draft.pinned} />
            </button>
            {!isNew && (
              <button
                type="button"
                onClick={() => onDelete(note!.id)}
                aria-label="Delete note"
                title="Delete"
                className="grid size-10 place-items-center rounded-xl text-muted hover:bg-danger-soft hover:text-danger"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 sm:px-6">
          <input
            ref={titleRef}
            value={draft.title}
            onChange={(e) => {
              update({ title: e.target.value });
              clearError("title");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (draft.kind === "text") bodyRef.current?.focus();
                else itemRefs.current.get(draft.items[0]?.id)?.focus();
              }
            }}
            placeholder="Title"
            aria-label="Title"
            aria-invalid={badFields.includes("title")}
            maxLength={200}
            className={`w-full rounded-lg bg-transparent py-2 text-2xl font-bold tracking-tight text-ink outline-none placeholder:text-muted/60 ${
              badFields.includes("title") ? "placeholder:text-danger/70" : ""
            }`}
          />

          {draft.kind === "text" ? (
            <textarea
              ref={bodyRef}
              value={draft.body}
              onChange={(e) => {
                update({ body: e.target.value });
                clearError("body");
              }}
              placeholder="Start writing…"
              aria-label="Note"
              aria-invalid={badFields.includes("body")}
              className={`mt-1 block w-full resize-none bg-transparent text-[16px] leading-relaxed text-ink outline-none placeholder:text-muted/60 ${
                badFields.includes("body") ? "placeholder:text-danger/70" : ""
              }`}
            />
          ) : (
            <div className="mt-1 min-h-40">
              {itemCount > 0 && (
                <p className="mb-1 text-xs text-muted">
                  {doneCount} of {itemCount} done
                </p>
              )}
              <ul className="flex flex-col">
                {draft.items.map((item) => (
                  <li key={item.id} className="group flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setItem(item.id, { done: !item.done })}
                      aria-label={item.done ? "Mark as not done" : "Mark as done"}
                      className={`grid size-9 shrink-0 place-items-center rounded-lg ${item.done ? "text-accent" : "text-muted hover:text-ink"}`}
                    >
                      {item.done ? <CheckSquareIcon size={20} /> : <SquareIcon size={20} />}
                    </button>
                    <input
                      ref={(el) => {
                        if (el) itemRefs.current.set(item.id, el);
                        else itemRefs.current.delete(item.id);
                      }}
                      value={item.text}
                      onChange={(e) => {
                        setItem(item.id, { text: e.target.value });
                        clearError("body");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addItemAfter(item.id);
                        } else if (e.key === "Backspace" && item.text === "" && draft.items.length > 1) {
                          e.preventDefault();
                          removeItem(item.id, true);
                        }
                      }}
                      placeholder="List item"
                      aria-label="List item"
                      enterKeyHint="next"
                      className={`h-10 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted/60 ${
                        item.done ? "text-muted line-through" : "text-ink"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label="Remove item"
                      className="grid size-9 shrink-0 place-items-center rounded-lg text-muted opacity-60 hover:bg-ink/[0.06] hover:text-ink sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                    >
                      <CloseIcon size={16} />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => addItemAfter(null)}
                className="mt-1 flex h-10 items-center gap-2 rounded-lg px-2 text-[15px] text-muted hover:text-ink"
              >
                <PlusIcon size={18} />
                Add item
              </button>
            </div>
          )}
        </div>

        {/* Tags + error */}
        <div className="px-3 sm:px-5">
          <TagInput
            tags={draft.tags}
            onTagsChange={(tags) => update({ tags })}
            draft={tagDraft}
            onDraftChange={setTagDraft}
            suggestions={existingTags}
          />
          {error && (
            <p role="alert" className="anim-pop mx-1 mb-1 rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
              {error}
            </p>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 border-t border-ink/[0.07] px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4">
          <button
            type="button"
            onClick={switchKind}
            aria-label={draft.kind === "text" ? "Turn into checklist" : "Turn into text"}
            title={draft.kind === "text" ? "Checklist" : "Text"}
            className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted hover:bg-ink/[0.06] hover:text-ink"
          >
            {draft.kind === "text" ? <ListChecksIcon /> : <TextIcon />}
            <span className="max-[360px]:hidden">{draft.kind === "text" ? "Checklist" : "Text"}</span>
          </button>
          <ColorPicker value={draft.color} onChange={(color) => update({ color })} />
          <div className="ml-auto flex items-center gap-2">
            {dirty && !isBlank && (
              <button
                type="button"
                onClick={onClose}
                className="anim-fade h-10 rounded-xl px-3 text-sm font-medium text-muted hover:bg-ink/[0.06] hover:text-ink"
              >
                Discard
              </button>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="h-10 rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.97] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save note"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
