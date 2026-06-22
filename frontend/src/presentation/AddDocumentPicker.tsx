import { useMemo, useState } from "react";
import type { FileItem } from "../api";
import FileIcon from "../FileIcon";
import { isPdfFile } from "../pdf/pdfFiles";

type Props = {
  open: boolean;
  files: FileItem[];
  excludeFileIds: number[];
  onAdd: (fileId: number) => void;
  onClose: () => void;
};

export default function AddDocumentPicker({
  open,
  files,
  excludeFileIds,
  onAdd,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");

  const candidates = useMemo(() => {
    const exclude = new Set(excludeFileIds);
    return files
      .filter((f) => isPdfFile(f) && !exclude.has(f.id))
      .filter((f) => {
        if (!query.trim()) return true;
        return f.originalName.toLowerCase().includes(query.trim().toLowerCase());
      });
  }, [files, excludeFileIds, query]);

  if (!open) return null;

  return (
    <div className="session-picker-backdrop" role="presentation" onClick={onClose}>
      <div
        className="session-picker-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="session-picker-head">
          <h2 id="session-picker-title" className="session-picker-title">
            Agregar documento
          </h2>
          <button type="button" className="session-picker-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>
        <input
          className="session-picker-search"
          placeholder="Buscar PDF…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar documento"
          autoFocus
        />
        <ul className="session-picker-list">
          {candidates.length === 0 && (
            <li className="session-picker-empty">No hay PDFs disponibles para agregar.</li>
          )}
          {candidates.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                className="session-picker-item"
                onClick={() => {
                  onAdd(file.id);
                  onClose();
                  setQuery("");
                }}
              >
                <FileIcon originalName={file.originalName} contentType={file.contentType} />
                <span className="session-picker-item-name">{file.originalName}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
