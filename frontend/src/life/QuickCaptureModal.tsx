import { FormEvent, useEffect, useRef, useState } from "react";
import { captureLifeInbox, isSessionExpired } from "../api";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onSessionLost: () => void;
  onError: (msg: string) => void;
};

export default function QuickCaptureModal({ open, onClose, onSaved, onSessionLost, onError }: Props) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setContent("");
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      const kind = text.startsWith("!") ? "TASK" : undefined;
      await captureLifeInbox(text.startsWith("!") ? text.slice(1).trim() : text, kind);
      onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al capturar";
      if (isSessionExpired(msg)) onSessionLost();
      else onError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="life-capture-backdrop" onMouseDown={onClose}>
      <form
        className="life-capture-modal"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => void handleSubmit(e)}
      >
        <h2 className="life-capture-modal__title">Captura rápida</h2>
        <p className="life-capture-modal__hint">
          Pega un mensaje de WhatsApp, un aviso de reunión o una idea. Luego en{" "}
          <strong>Vida → Captura</strong> lo conviertes en tarea con fecha.{" "}
          <kbd>⌘↵</kbd> para guardar · <kbd>!</kbd> al inicio marca como tarea.
        </p>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ej. «Estudiantes: reunión el viernes 10:00 en el aula 3…»"
          aria-label="Captura rápida"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void handleSubmit(e);
            }
          }}
        />
        <div className="life-capture-modal__actions">
          <button type="button" className="btn ghost sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn primary sm" disabled={saving || !content.trim()}>
            {saving ? "Guardando…" : "Guardar en bandeja"}
          </button>
        </div>
      </form>
    </div>
  );
}
