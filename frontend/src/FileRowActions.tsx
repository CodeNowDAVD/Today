import type { MouseEvent } from "react";
import { Copy, Download, Pencil, RotateCcw, Share2, Trash2 } from "lucide-react";
import type { FileItem } from "./api";

type Props = {
  file: FileItem;
  isTrash: boolean;
  canEdit: boolean;
  onDownload: () => void;
  onShare?: () => void;
  onCopy?: () => void;
  onRename?: () => void;
  onTrash: () => void;
  onRestore: () => void;
  variant?: "text" | "icons" | "icons-inline";
};

export default function FileRowActions({
  isTrash,
  canEdit,
  onDownload,
  onShare,
  onCopy,
  onRename,
  onTrash,
  onRestore,
  variant = "text",
}: Props) {
  const stop = (e: MouseEvent, fn: () => void) => {
    e.stopPropagation();
    fn();
  };

  if (variant === "icons" || variant === "icons-inline") {
    return (
      <div
        className={[
          "file-row-actions",
          variant === "icons-inline" && "file-row-actions--inline",
        ]
          .filter(Boolean)
          .join(" ")}
        role="group"
        aria-label="Acciones del archivo"
      >
        <button
          type="button"
          className="file-row-actions__btn"
          onClick={(e) => stop(e, onDownload)}
          title="Descargar"
          aria-label="Descargar"
        >
          <Download size={16} strokeWidth={2.25} aria-hidden />
        </button>
        {!isTrash && onShare && (
          <button
            type="button"
            className="file-row-actions__btn"
            onClick={(e) => stop(e, onShare)}
            title="Compartir (WhatsApp, Mail…)"
            aria-label="Compartir"
          >
            <Share2 size={16} strokeWidth={2.25} aria-hidden />
          </button>
        )}
        {canEdit && !isTrash && onRename && (
          <button
            type="button"
            className="file-row-actions__btn"
            onClick={(e) => stop(e, onRename)}
            title="Renombrar"
            aria-label="Renombrar"
          >
            <Pencil size={16} strokeWidth={2.25} aria-hidden />
          </button>
        )}
        {canEdit && !isTrash && onCopy && (
          <button
            type="button"
            className="file-row-actions__btn"
            onClick={(e) => stop(e, onCopy)}
            title="Copiar para pegar (p. ej. WhatsApp)"
            aria-label="Copiar para pegar"
          >
            <Copy size={16} strokeWidth={2.25} aria-hidden />
          </button>
        )}
        {isTrash ? (
          <button
            type="button"
            className="file-row-actions__btn"
            onClick={(e) => stop(e, onRestore)}
            title="Restaurar"
            aria-label="Restaurar"
          >
            <RotateCcw size={16} strokeWidth={2.25} aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            className="file-row-actions__btn file-row-actions__btn--danger"
            onClick={(e) => stop(e, onTrash)}
            title="Eliminar"
            aria-label="Eliminar"
          >
            <Trash2 size={16} strokeWidth={2.25} aria-hidden />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="file-actions">
      <div className="file-actions-slot">
        <button type="button" className="row-action-btn" onClick={(e) => stop(e, onDownload)}>
          Descargar
        </button>
      </div>

      {!isTrash && onShare && (
        <div className="file-actions-slot">
          <button
            type="button"
            className="row-action-btn"
            onClick={(e) => stop(e, onShare)}
            title="Compartir en WhatsApp, Mail u otra app"
          >
            Compartir
          </button>
        </div>
      )}

      {canEdit && !isTrash && onRename && (
        <div className="file-actions-slot">
          <button type="button" className="row-action-btn" onClick={(e) => stop(e, onRename)}>
            Renombrar
          </button>
        </div>
      )}

      {canEdit && !isTrash && onCopy && (
        <div className="file-actions-slot">
          <button
            type="button"
            className="row-action-btn"
            onClick={(e) => stop(e, onCopy)}
            title="Copiar para pegar en WhatsApp u otra app"
          >
            Copiar
          </button>
        </div>
      )}

      <div className="file-actions-slot">
        {isTrash ? (
          <button type="button" className="row-action-btn" onClick={(e) => stop(e, onRestore)}>
            Restaurar
          </button>
        ) : (
          <button type="button" className="row-action-btn row-action-danger" onClick={(e) => stop(e, onTrash)}>
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
