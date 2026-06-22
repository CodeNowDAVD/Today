import { FormEvent, useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void | Promise<void>;
};

export default function CreateFolderDialog({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setSaving(false);
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, saving]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await onCreate(trimmed);
      onClose();
    } catch {
      /* el error lo muestra App */
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="confirm-backdrop" role="presentation" onClick={saving ? undefined : onClose}>
      <div
        className="folder-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="folder-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="folder-modal-header">
          <h2 id="folder-modal-title" className="folder-modal-title">
            Nueva carpeta
          </h2>
          <button
            type="button"
            className="folder-modal-close"
            aria-label="Cerrar"
            onClick={onClose}
            disabled={saving}
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <label className="folder-modal-label" htmlFor="folder-modal-name">
            Nombre de la carpeta
          </label>
          <input
            id="folder-modal-name"
            ref={inputRef}
            className="folder-modal-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Virtualización"
            maxLength={120}
            autoComplete="off"
            disabled={saving}
          />
          <p className="folder-modal-hint">
            Agrupa archivos por tema o cliente. Puedes mover archivos entre carpetas cuando quieras.
          </p>
          <div className="confirm-actions">
            <button type="button" className="btn" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn primary" disabled={!name.trim() || saving}>
              {saving ? "Creando…" : "Crear carpeta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
