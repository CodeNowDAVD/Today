import { FormEvent, useEffect, useState } from "react";
import { createFolderTag, deleteFolderTag, FolderTagItem } from "./api";

const PRESET_COLORS = [
  "#5B8DEF",
  "#47B881",
  "#F0AB00",
  "#9B7EDE",
  "#E86C6C",
  "#6BC5C8",
  "#C48F00",
  "#8B9DAF",
];

type Props = {
  open: boolean;
  folderId: number;
  folderName: string;
  tags: FolderTagItem[];
  onClose: () => void;
  onChanged: () => void;
  onError: (msg: string) => void;
};

export default function ManageFolderTagsDialog({
  open,
  folderId,
  folderName,
  tags,
  onClose,
  onChanged,
  onError,
}: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setColor("");
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await createFolderTag(folderId, trimmed, color || undefined);
      setName("");
      setColor("");
      onChanged();
      onError("");
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo crear la etiqueta");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(tag: FolderTagItem) {
    if (!window.confirm(`¿Eliminar la etiqueta «${tag.name}»? Se quitará de los archivos.`)) return;
    try {
      await deleteFolderTag(tag.id);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  }

  return (
    <div className="confirm-backdrop" role="presentation" onClick={onClose}>
      <div
        className="folder-modal-card tag-manage-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tag-manage-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="folder-modal-header">
          <h2 id="tag-manage-title" className="folder-modal-title">
            Etiquetas · {folderName}
          </h2>
          <button type="button" className="folder-modal-close" aria-label="Cerrar" onClick={onClose}>
            ×
          </button>
        </header>

        <p className="folder-modal-hint">
          Crea etiquetas para clasificar entregables. El color es opcional; si no eliges uno, se asigna
          automáticamente.
        </p>

        <form onSubmit={handleCreate} className="tag-manage-create">
          <label className="folder-modal-label" htmlFor="new-tag-name">
            Nueva etiqueta
          </label>
          <input
            id="new-tag-name"
            className="folder-modal-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Manual, Pruebas, CI/CD"
            maxLength={60}
          />
          <span className="folder-modal-label">Color (opcional)</span>
          <div className="tag-color-row">
            <input
              type="color"
              className="tag-color-input"
              value={color || "#5B8DEF"}
              onChange={(e) => setColor(e.target.value.toUpperCase())}
              title="Elegir color"
            />
            <div className="tag-color-presets">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`tag-color-swatch ${color === c ? "on" : ""}`}
                  style={{ background: c }}
                  title={c}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
            <button type="button" className="btn ghost sm" onClick={() => setColor("")}>
              Auto
            </button>
          </div>
          <button type="submit" className="btn primary" disabled={saving || !name.trim()}>
            {saving ? "Creando…" : "Añadir etiqueta"}
          </button>
        </form>

        {tags.length > 0 && (
          <ul className="tag-manage-list">
            {tags.map((t) => (
              <li key={t.id}>
                <span
                  className="file-tag-chip"
                  style={{ "--tag-color": t.color } as React.CSSProperties}
                >
                  {t.name}
                </span>
                <button type="button" className="btn ghost sm" onClick={() => void handleDelete(t)}>
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
