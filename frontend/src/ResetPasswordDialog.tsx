import { FormEvent, useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  username: string;
  onClose: () => void;
  onSave: (password: string) => void | Promise<void>;
};

const MIN_LEN = 8;

export default function ResetPasswordDialog({ open, username, onClose, onSave }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setConfirm("");
    setSaving(false);
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open, username]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, saving]);

  if (!open) return null;

  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < MIN_LEN;
  const canSubmit =
    password.length >= MIN_LEN && password === confirm && !saving;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onSave(password);
      onClose();
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
        aria-labelledby="pwd-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="folder-modal-header">
          <h2 id="pwd-modal-title" className="folder-modal-title">
            Nueva contraseña
          </h2>
          <button
            type="button"
            className="folder-modal-close"
            aria-label="Cerrar"
            disabled={saving}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <p className="folder-modal-hint">
          Usuario <strong>{username}</strong>. Mínimo {MIN_LEN} caracteres.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <label className="folder-modal-label" htmlFor="pwd-new">
            Contraseña
          </label>
          <input
            id="pwd-new"
            ref={inputRef}
            type="password"
            className="folder-modal-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={MIN_LEN}
            required
          />

          <label className="folder-modal-label" htmlFor="pwd-confirm">
            Repetir contraseña
          </label>
          <input
            id="pwd-confirm"
            type="password"
            className="folder-modal-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={MIN_LEN}
            required
          />

          {tooShort && (
            <p className="alert error" role="alert">
              La contraseña debe tener al menos {MIN_LEN} caracteres.
            </p>
          )}
          {mismatch && (
            <p className="alert error" role="alert">
              Las contraseñas no coinciden.
            </p>
          )}

          <div className="confirm-actions">
            <button type="button" className="btn" disabled={saving} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn primary" disabled={!canSubmit}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
