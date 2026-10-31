"use client";

import { useRef, useState } from "react";
import { tagColor } from "../lib/notes";
import { CloseIcon, TagIcon } from "./Icons";

type Props = {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  draft: string;
  onDraftChange: (draft: string) => void;
  suggestions: string[];
};

/** Type a tag and press Enter or a comma. Backspace removes the last one. */
export default function TagInput({ tags, onTagsChange, draft, onDraftChange, suggestions }: Props) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function commit(raw: string) {
    const parts = raw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const next = [...tags];
    for (const p of parts) if (!next.includes(p)) next.push(p);
    onTagsChange(next);
    onDraftChange("");
  }

  const q = draft.trim().toLowerCase();
  const matches = suggestions.filter((s) => !tags.includes(s) && (!q || s.startsWith(q))).slice(0, 6);

  return (
    <div>
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex min-h-11 cursor-text flex-wrap items-center gap-1.5 rounded-xl px-1 py-1.5"
      >
        <TagIcon size={16} className="mx-1 shrink-0 text-muted" />
        {tags.map((tag) => (
          <span
            key={tag}
            className="anim-pop inline-flex h-7 items-center gap-1.5 rounded-full bg-ink/[0.06] pl-2.5 pr-1 text-sm"
          >
            <span className="size-2 rounded-full" style={{ background: tagColor(tag) }} />
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTagsChange(tags.filter((t) => t !== tag));
              }}
              aria-label={`Remove tag ${tag}`}
              className="grid size-5 place-items-center rounded-full text-muted hover:bg-ink/10 hover:text-ink"
            >
              <CloseIcon size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) commit(v);
            else onDraftChange(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && !draft && tags.length) {
              onTagsChange(tags.slice(0, -1));
            }
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (draft.trim()) commit(draft);
          }}
          placeholder={tags.length ? "Add tag" : "Add tags, like work or church"}
          aria-label="Tags"
          autoCapitalize="none"
          autoCorrect="off"
          enterKeyHint="done"
          className="h-7 min-w-28 flex-1 bg-transparent px-1 text-[15px] text-ink outline-none placeholder:text-muted/80"
        />
      </div>
      {focused && matches.length > 0 && (
        <div className="anim-fade flex flex-wrap items-center gap-1.5 px-2 pb-1 text-sm">
          {matches.map((tag) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(e) => e.preventDefault()} // keep focus in the input
              onClick={() => commit(tag)}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-dashed border-ink/20 px-2.5 text-muted hover:border-accent hover:text-ink"
            >
              <span className="size-2 rounded-full" style={{ background: tagColor(tag) }} />
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
