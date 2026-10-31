"use client";

import type { Note, NoteColor } from "../actions";
import { formatDate, noteBackground, tagColor } from "../lib/notes";
import ColorPicker from "./ColorPicker";
import Highlight from "./Highlight";
import { CheckSquareIcon, PinIcon, SquareIcon, TrashIcon } from "./Icons";

type Props = {
  note: Note;
  query: string;
  activeTag: string | null;
  onOpen: () => void;
  onTogglePin: () => void;
  onToggleItem: (itemId: string) => void;
  onColor: (color: NoteColor) => void;
  onDelete: () => void;
  onTag: (tag: string) => void;
};

const PREVIEW_ITEMS = 6;

export default function NoteCard({ note, query, activeTag, onOpen, onTogglePin, onToggleItem, onColor, onDelete, onTag }: Props) {
  const items = note.items;
  const shown = items.slice(0, PREVIEW_ITEMS);
  const hidden = items.length - shown.length;
  const done = items.filter((i) => i.done).length;

  // Hover-reveal on devices with a mouse; always visible on touch screens.
  const reveal =
    "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100";

  return (
    <article
      className="anim-pop group relative mb-4 break-inside-avoid rounded-2xl border border-line p-4 pb-2 shadow-[var(--shadow)] transition-[box-shadow,border-color,transform] hover:border-ink/15 hover:shadow-[0_6px_20px_rgba(16,24,40,0.08)] focus-within:border-ink/15"
      style={{ background: noteBackground(note.color) }}
    >
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 pt-0.5 text-[17px] font-bold leading-snug tracking-tight break-words">
          {/* The title button covers the whole card, so a tap anywhere opens the note. */}
          <button
            type="button"
            onClick={onOpen}
            className="text-left outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent"
          >
            <Highlight text={note.title} query={query} />
          </button>
        </h3>
        <button
          type="button"
          onClick={onTogglePin}
          aria-pressed={note.pinned}
          aria-label={note.pinned ? `Unpin “${note.title}”` : `Pin “${note.title}”`}
          title={note.pinned ? "Unpin" : "Pin to top"}
          className={`relative z-10 -mr-2 -mt-1.5 grid size-9 shrink-0 place-items-center rounded-lg transition-[opacity,color,background-color] hover:bg-ink/[0.06] ${
            note.pinned ? "text-accent" : `text-muted hover:text-ink ${reveal}`
          }`}
        >
          <PinIcon filled={note.pinned} size={17} />
        </button>
      </div>

      {note.kind === "text" ? (
        <p className="mt-1.5 line-clamp-[10] whitespace-pre-line break-words text-[15px] leading-relaxed text-ink/85">
          <Highlight text={note.body} query={query} />
        </p>
      ) : (
        <div className="mt-1.5">
          <ul className="flex flex-col">
            {shown.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onToggleItem(item.id)}
                  aria-pressed={item.done}
                  className="relative z-10 -ml-1 flex w-[calc(100%+0.25rem)] items-start gap-2 rounded-md px-1 py-1 text-left text-[15px] hover:bg-ink/[0.04]"
                >
                  <span className={`mt-0.5 shrink-0 ${item.done ? "text-accent" : "text-muted"}`}>
                    {item.done ? <CheckSquareIcon size={17} /> : <SquareIcon size={17} />}
                  </span>
                  <span className={`min-w-0 break-words ${item.done ? "text-muted line-through" : "text-ink/85"}`}>
                    <Highlight text={item.text} query={query} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {hidden > 0 && <p className="mt-0.5 pl-7 text-sm text-muted">+{hidden} more</p>}
          <p className="mt-1 text-xs text-muted">
            {done} of {items.length} done
          </p>
        </div>
      )}

      {note.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTag(tag)}
              aria-pressed={activeTag === tag}
              title={`Show notes tagged ${tag}`}
              className={`relative z-10 inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[13px] transition-colors ${
                activeTag === tag ? "bg-ink text-surface" : "bg-ink/[0.06] text-ink hover:bg-ink/10"
              }`}
            >
              <span className="size-2 rounded-full" style={{ background: tagColor(tag) }} />
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-1">
        <span className="text-xs text-muted">{formatDate(note.updatedAt)}</span>
        <div className={`relative z-10 ml-auto flex items-center transition-opacity ${reveal}`}>
          <ColorPicker value={note.color} onChange={onColor} align="right" />
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete “${note.title}”`}
            title="Delete"
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
          >
            <TrashIcon size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}
