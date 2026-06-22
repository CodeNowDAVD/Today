import { useEffect, useMemo, useRef, useState } from "react";
import type { FolderTagItem } from "./api";

export type LinkSaveTagChoice = "none" | number;

type Props = {
  folders: { id: number; name: string }[];
  tags: FolderTagItem[];
  value: LinkSaveTagChoice;
  onChange: (value: LinkSaveTagChoice) => void;
};

export default function LinkSaveTagPicker({ folders, tags, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const byFolder = useMemo(() => {
    const map = new Map<number, FolderTagItem[]>();
    for (const t of tags) {
      const list = map.get(t.folderId) ?? [];
      list.push(t);
      map.set(t.folderId, list);
    }
    return map;
  }, [tags]);

  const selectedTag = value === "none" ? null : tags.find((t) => t.id === value) ?? null;
  const selectedLabel = selectedTag?.name ?? "Ninguna";

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: LinkSaveTagChoice) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div className="link-save-tag-field">
      <span className="link-save-tag-label" id="link-save-tag-label">
        <span className="field-label">Etiqueta</span>
        <span className="link-save-tag-optional">opcional</span>
      </span>
      <div className="tag-picker" ref={wrapRef}>
        <button
          type="button"
          className="field-input tag-picker-trigger"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-labelledby="link-save-tag-label"
          onClick={() => setOpen((o) => !o)}
        >
          {selectedTag ? (
            <span
              className="tag-picker-dot"
              style={{ "--tag-color": selectedTag.color } as React.CSSProperties}
              aria-hidden
            />
          ) : null}
          <span className="tag-picker-value">{selectedLabel}</span>
          <span className="tag-picker-caret" aria-hidden>
            ▾
          </span>
        </button>
        {open && (
          <ul className="tag-picker-menu" role="listbox" aria-label="Etiqueta al guardar">
            <li>
              <button
                type="button"
                role="option"
                aria-selected={value === "none"}
                className={value === "none" ? "on" : ""}
                onClick={() => pick("none")}
              >
                Ninguna
              </button>
            </li>
            {folders.map((f) => {
              const folderTags = byFolder.get(f.id);
              if (!folderTags?.length) return null;
              return (
                <li key={f.id} className="tag-picker-group" role="presentation">
                  <span className="tag-picker-group-label">{f.name}</span>
                  <ul className="tag-picker-group-list" role="group" aria-label={f.name}>
                    {folderTags.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={value === t.id}
                          className={value === t.id ? "on" : ""}
                          onClick={() => pick(t.id)}
                        >
                          <span
                            className="tag-picker-dot"
                            style={{ "--tag-color": t.color } as React.CSSProperties}
                            aria-hidden
                          />
                          {t.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
