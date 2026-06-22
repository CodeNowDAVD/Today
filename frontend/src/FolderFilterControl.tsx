import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FolderItem } from "./api";
import { LOOSE_FOLDER_LABEL, folderInitial } from "./folderUi";
import type { FolderFilter } from "./ProjectsNav";
import { SidebarFolderIcon, SidebarInboxIcon } from "./SidebarIcons";

type Props = {
  filter: FolderFilter;
  folders: FolderItem[];
  loading?: boolean;
  onSelect: (f: FolderFilter) => void;
};

function filterLabel(filter: FolderFilter, folders: FolderItem[]): string {
  if (filter === "all") return "Todas las carpetas";
  if (filter === "none") return LOOSE_FOLDER_LABEL;
  return folders.find((f) => f.id === filter)?.name ?? "Carpeta";
}

export default function FolderFilterControl({
  filter,
  folders,
  loading = false,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const active = filter !== "all";
  const label = filterLabel(filter, folders);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPos(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const panelW = 248;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - panelW - 8));
    setPos({ top: rect.bottom + 6, left });
  }, [open, folders.length, filter]);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
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

  function pick(f: FolderFilter) {
    onSelect(f);
    setOpen(false);
  }

  return (
    <div className="folder-filter-control">
      <button
        ref={triggerRef}
        type="button"
        className={[
          "folder-filter-control__trigger",
          open && "is-open",
          active && "on",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Carpeta: ${label}`}
        title={label}
      >
        <span className="folder-filter-control__icon" aria-hidden>
          <SidebarFolderIcon />
        </span>
        <span className="folder-filter-control__label">{label}</span>
        <span className="folder-filter-control__chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={panelRef}
              className="folder-filter-control__panel folder-filter-control__panel--floating"
              style={{ top: pos.top, left: pos.left }}
              role="listbox"
              aria-label="Filtrar por carpeta"
            >
              <button
                type="button"
                role="option"
                aria-selected={filter === "all"}
                className={[
                  "folder-filter-control__item",
                  filter === "all" && "on",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => pick("all")}
              >
                <span className="folder-filter-control__item-icon" aria-hidden>
                  <SidebarInboxIcon />
                </span>
                <span>Todos los archivos</span>
              </button>
              <button
                type="button"
                role="option"
                aria-selected={filter === "none"}
                className={[
                  "folder-filter-control__item",
                  filter === "none" && "on",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => pick("none")}
              >
                <span className="folder-filter-control__item-initial" aria-hidden>
                  ·
                </span>
                <span>{LOOSE_FOLDER_LABEL}</span>
              </button>
              {folders.length > 0 ? (
                <div className="folder-filter-control__divider" aria-hidden />
              ) : null}
              {loading && folders.length === 0 ? (
                <p className="folder-filter-control__muted">Cargando…</p>
              ) : null}
              {!loading && folders.length === 0 ? (
                <p className="folder-filter-control__muted">Sin carpetas</p>
              ) : null}
              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="option"
                  aria-selected={filter === f.id}
                  className={[
                    "folder-filter-control__item",
                    filter === f.id && "on",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => pick(f.id)}
                >
                  <span className="folder-filter-control__item-initial" aria-hidden>
                    {folderInitial(f.name)}
                  </span>
                  <span className="folder-filter-control__item-name">{f.name}</span>
                  {f.fileCount > 0 ? (
                    <span className="folder-filter-control__item-count">{f.fileCount}</span>
                  ) : null}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
