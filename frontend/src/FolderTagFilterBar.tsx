import { useRef } from "react";
import type { FolderTagItem } from "./api";
import { writeDraggedTagId } from "./tagDrag";

type Props = {
  tags: FolderTagItem[];
  selectedTagIds: number[];
  onToggle: (tagId: number) => void;
  onClear: () => void;
  onManage: () => void;
  /** Etiquetas en la misma fila que el título (vista de carpeta). */
  inline?: boolean;
  /** Solo chips en la barra de herramientas (sin «Gestionar» suelto). */
  strip?: boolean;
};

export default function FolderTagFilterBar({
  tags,
  selectedTagIds,
  onToggle,
  onClear,
  onManage,
  inline = false,
  strip = false,
}: Props) {
  const didDrag = useRef(false);

  const chipRow =
    tags.length === 0 ? (
      strip ? null : (
        <p className="tag-filter-empty">Crea etiquetas para clasificar y filtrar tus archivos.</p>
      )
    ) : (
      <>
        {!inline && !strip && (
          <p className="tag-filter-hint">Clic para filtrar · arrastra al archivo para etiquetar</p>
        )}
        <div className="tag-chip-row" role="group" aria-label="Filtrar y etiquetar">
          {tags.length > 1 && (
            <button
              type="button"
              className={`tag-chip tag-chip--action ${selectedTagIds.length === 0 ? "on" : ""}`}
              onClick={onClear}
            >
              Todos
            </button>
          )}
          {tags.map((t) => {
            const on = selectedTagIds.includes(t.id);
            return (
              <span
                key={t.id}
                role="button"
                tabIndex={0}
                draggable
                className={`tag-chip tag-chip--tag ${on ? "on" : ""}`}
                style={{ "--tag-color": t.color } as React.CSSProperties}
                title={on ? `Quitar filtro «${t.name}»` : `Filtrar por «${t.name}» · arrastrar al archivo`}
                onDragStart={(e) => {
                  didDrag.current = true;
                  writeDraggedTagId(e.dataTransfer, t.id);
                  e.currentTarget.classList.add("is-dragging");
                }}
                onDragEnd={(e) => {
                  e.currentTarget.classList.remove("is-dragging");
                  window.setTimeout(() => {
                    didDrag.current = false;
                  }, 0);
                }}
                onClick={() => {
                  if (didDrag.current) return;
                  onToggle(t.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onToggle(t.id);
                  }
                }}
              >
                {t.name}
              </span>
            );
          })}
        </div>
      </>
    );

  if (strip) {
    if (!chipRow) return null;
    return (
      <div className="tag-filter-bar tag-filter-bar--strip" aria-label="Filtrar por etiqueta">
        {chipRow}
      </div>
    );
  }

  if (inline) {
    return (
      <section
        className="tag-filter-bar tag-filter-bar--inline"
        aria-label="Etiquetas de la carpeta"
      >
        <span className="tag-filter-label">Etiquetas</span>
        {chipRow}
        <button type="button" className="btn ghost sm tag-filter-manage" onClick={onManage}>
          Gestionar
        </button>
      </section>
    );
  }

  return (
    <section className="tag-filter-bar" aria-label="Etiquetas de la carpeta">
      <div className="tag-filter-head">
        <span className="tag-filter-label">Etiquetas</span>
        <button type="button" className="btn ghost sm" onClick={onManage}>
          Gestionar
        </button>
      </div>
      {chipRow}
    </section>
  );
}
