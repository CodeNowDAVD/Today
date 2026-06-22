import { GripVertical, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { FileItem } from "../api";
import { getFileIconMeta } from "../FileIcon";
import type { PdfDocMeta } from "../pdf/usePdfDocuments";
import { SESSION_CATEGORIES, getCategoryById } from "./categories";
import type { PresentationSession, PresentationSessionItem } from "./types";
import { fileNameById } from "./sessionUtils";
import { normalizeItemOrders } from "./storage";
import AddDocumentPicker from "./AddDocumentPicker";

type Props = {
  session: PresentationSession;
  files: FileItem[];
  availableFiles: FileItem[];
  activeIndex: number;
  metas: PdfDocMeta[];
  onSessionChange: (session: PresentationSession) => void;
  onSelectIndex: (index: number) => void;
};

function CategoryChip({
  categoryId,
  onChange,
}: {
  categoryId?: string;
  onChange: (categoryId: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const category = getCategoryById(categoryId);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="session-category-wrap" ref={ref}>
      <button
        type="button"
        className={[
          "session-category-chip",
          category && "session-category-chip--set",
        ]
          .filter(Boolean)
          .join(" ")}
        style={category ? ({ "--session-cat-color": category.color } as CSSProperties) : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title={category ? category.label : "Asignar categoría"}
      >
        {category ? category.label : "+"}
      </button>
      {open && (
        <div className="session-category-menu" role="menu">
          <button
            type="button"
            className="session-category-menu-item session-category-menu-item--clear"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
              setOpen(false);
            }}
          >
            Sin categoría
          </button>
          {SESSION_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className="session-category-menu-item"
              style={{ "--session-cat-color": cat.color } as CSSProperties}
              onClick={(e) => {
                e.stopPropagation();
                onChange(cat.id);
                setOpen(false);
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SessionPanelSidebar({
  session,
  files,
  availableFiles,
  activeIndex,
  metas,
  onSessionChange,
  onSelectIndex,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const items = normalizeItemOrders(session.items);

  const updateItems = useCallback(
    (nextItems: PresentationSessionItem[]) => {
      onSessionChange({
        ...session,
        items: normalizeItemOrders(nextItems),
        updatedAt: new Date().toISOString(),
      });
    },
    [session, onSessionChange],
  );

  const reorder = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      updateItems(next);
    },
    [items, updateItems],
  );

  const setCategory = useCallback(
    (fileId: number, category?: string) => {
      updateItems(
        items.map((item) => (item.fileId === fileId ? { ...item, category } : item)),
      );
    },
    [items, updateItems],
  );

  const removeItem = useCallback(
    (fileId: number) => {
      updateItems(items.filter((item) => item.fileId !== fileId));
    },
    [items, updateItems],
  );

  const addFile = useCallback(
    (fileId: number) => {
      if (items.some((i) => i.fileId === fileId)) return;
      updateItems([...items, { fileId, order: items.length }]);
    },
    [items, updateItems],
  );

  function pageLabel(fileId: number): string {
    const meta = metas.find((m) => m.id === fileId);
    if (!meta || meta.status === "loading" || meta.status === "pending") return "…";
    if (meta.status === "error") return "—";
    if (meta.pageCount != null) return `${meta.pageCount} pág.`;
    return "—";
  }

  return (
    <aside className="session-panel-sidebar">
      <header className="session-panel-sidebar__head">
        <input
          className="session-panel-sidebar__title-input"
          value={session.title}
          onChange={(e) =>
            onSessionChange({
              ...session,
              title: e.target.value,
              updatedAt: new Date().toISOString(),
            })
          }
          aria-label="Título de la sesión"
        />
        <span className="session-panel-sidebar__badge">
          {items.length} documento{items.length === 1 ? "" : "s"}
        </span>
        <input
          className="session-panel-sidebar__subtitle-input"
          value={session.subtitle ?? ""}
          placeholder="Subtítulo opcional"
          onChange={(e) =>
            onSessionChange({
              ...session,
              subtitle: e.target.value || undefined,
              updatedAt: new Date().toISOString(),
            })
          }
          aria-label="Subtítulo de la sesión"
        />
      </header>

      <ol className="session-panel-sidebar__list" aria-label="Documentos de la sesión">
        {items.map((item, index) => {
          const name = fileNameById(files, item.fileId);
          const iconMeta = getFileIconMeta(
            name,
            files.find((f) => f.id === item.fileId)?.contentType,
          );
          const isActive = index === activeIndex;
          const isDragOver = dropIndex === index && dragIndex !== null && dragIndex !== index;

          return (
            <li
              key={item.fileId}
              className={[
                "session-panel-sidebar__item",
                isActive && "session-panel-sidebar__item--active",
                isDragOver && "session-panel-sidebar__item--drag-over",
              ]
                .filter(Boolean)
                .join(" ")}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => {
                setDragIndex(null);
                setDropIndex(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDropIndex(index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex != null) reorder(dragIndex, index);
                setDragIndex(null);
                setDropIndex(null);
              }}
            >
              <span className="session-panel-sidebar__drag" aria-hidden>
                <GripVertical size={14} strokeWidth={2} />
              </span>
              <button
                type="button"
                className="session-panel-sidebar__item-btn"
                onClick={() => onSelectIndex(index)}
              >
                <span className="session-panel-sidebar__num">{index + 1}</span>
                <span className="session-panel-sidebar__item-body">
                  <span className="session-panel-sidebar__name" title={name}>
                    {name}
                  </span>
                  <span className="session-panel-sidebar__meta">
                    {pageLabel(item.fileId)} · {iconMeta.label}
                  </span>
                </span>
              </button>
              <CategoryChip
                categoryId={item.category}
                onChange={(cat) => setCategory(item.fileId, cat)}
              />
              <button
                type="button"
                className="session-panel-sidebar__remove"
                onClick={() => removeItem(item.fileId)}
                aria-label={`Quitar ${name}`}
                title="Quitar"
              >
                ×
              </button>
            </li>
          );
        })}
      </ol>

      <footer className="session-panel-sidebar__foot">
        <button
          type="button"
          className="session-panel-sidebar__add"
          onClick={() => setPickerOpen(true)}
        >
          <Plus size={16} strokeWidth={2.25} aria-hidden />
          Agregar documento
        </button>
      </footer>

      <AddDocumentPicker
        open={pickerOpen}
        files={availableFiles}
        excludeFileIds={items.map((i) => i.fileId)}
        onAdd={addFile}
        onClose={() => setPickerOpen(false)}
      />
    </aside>
  );
}
