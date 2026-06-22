import { FormEvent, useEffect, useRef, useState } from "react";
import { defaultTextNoteName, normalizeTextNoteFileName } from "./textNote/plainTextToMarkdown";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, content: string) => void | Promise<void>;
};

export default function CreateTextNoteDialog({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState(defaultTextNoteName());
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(defaultTextNoteName());
    setContent("");
    setSaving(false);
    const t = window.setTimeout(() => contentRef.current?.focus(), 50);
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
    if (saving) return;
    setSaving(true);
    try {
      await onCreate(normalizeTextNoteFileName(name), content);
      onClose();
    } catch {
      /* el error lo muestra el caller */
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="confirm-backdrop" role="presentation" onClick={saving ? undefined : onClose}>
      <div
        className="folder-modal-card text-note-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="text-note-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="folder-modal-header">
          <h2 id="text-note-dialog-title" className="folder-modal-title">
            Nueva nota de texto
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
          <label className="folder-modal-label" htmlFor="text-note-dialog-name">
            Nombre del archivo
          </label>
          <input
            id="text-note-dialog-name"
            className="folder-modal-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="nota.text"
            maxLength={180}
            autoComplete="off"
            disabled={saving}
          />

          <label className="folder-modal-label" htmlFor="text-note-dialog-content">
            Contenido
          </label>
          <textarea
            id="text-note-dialog-content"
            ref={contentRef}
            className="text-note-dialog__content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe lo que quieras. Se verá como Markdown en la vista previa."
            rows={8}
            disabled={saving}
          />

          <p className="folder-modal-hint">
            Se guarda como <code>.text</code>. Puedes seguir editando y añadiendo texto después.
          </p>

          <div className="confirm-actions">
            <button type="button" className="btn" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? "Creando…" : "Crear nota"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
