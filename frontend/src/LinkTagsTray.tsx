import type { FolderTagItem } from "./api";
import { writeDraggedTagId } from "./tagDrag";
import { useRef } from "react";

type Props = {
  tags: FolderTagItem[];
};

/** Bandeja compacta de etiquetas para arrastrar a filas de enlaces. */
export default function LinkTagsTray({ tags }: Props) {
  const didDrag = useRef(false);

  return (
    <section className="link-tags-tray tag-filter-bar tag-filter-bar--inline" aria-label="Etiquetas para enlaces">
      <div className="link-tags-tray-head tag-filter-head">
        <span className="link-tags-tray-label tag-filter-label">Etiquetas</span>
        <span className="link-tags-tray-hint">arrastra a la fila</span>
      </div>
      {tags.length === 0 ? (
        <p className="link-tags-tray-empty">Créalas en Archivos → proyecto → Gestionar.</p>
      ) : (
        <div className="tag-chip-row" role="group">
          {tags.map((t) => (
            <span
              key={t.id}
              role="button"
              tabIndex={0}
              draggable
              className="tag-chip tag-chip--tag"
              style={{ "--tag-color": t.color } as React.CSSProperties}
              title={`Arrastrar «${t.name}» al enlace`}
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
            >
              {t.name}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
