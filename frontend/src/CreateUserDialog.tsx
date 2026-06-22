import { FormEvent, useEffect, useRef, useState } from "react";
import type { Role } from "./api";

const MIN_PASSWORD = 8;

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (username: string, password: string, role: Role) => void | Promise<void>;
};

export default function CreateUserDialog({ open, onClose, onCreate }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setUsername("");
    setPassword("");
    setConfirm("");
    setRole("USER");
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

  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit =
    username.trim().length >= 2 &&
    password.length >= MIN_PASSWORD &&
    password === confirm &&
    !saving;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onCreate(username.trim(), password, role);
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
        aria-labelledby="user-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="folder-modal-header">
          <h2 id="user-modal-title" className="folder-modal-title">
            Nuevo usuario
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

        <form onSubmit={(e) => void handleSubmit(e)}>
          <label className="folder-modal-label" htmlFor="new-user-name">
            Usuario
          </label>
          <input
            id="new-user-name"
            ref={inputRef}
            className="folder-modal-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            minLength={2}
            maxLength={80}
            required
          />

          <label className="folder-modal-label" htmlFor="new-user-pass">
            Contraseña
          </label>
          <input
            id="new-user-pass"
            type="password"
            className="folder-modal-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            required
          />

          <label className="folder-modal-label" htmlFor="new-user-pass2">
            Repetir contraseña
          </label>
          <input
            id="new-user-pass2"
            type="password"
            className="folder-modal-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            required
          />

          {mismatch && (
            <p className="users-inline-error" role="alert">
              Las contraseñas no coinciden.
            </p>
          )}

          <p className="folder-modal-label" style={{ marginTop: "0.75rem" }}>
            Rol
          </p>
          <div className="users-role-toggle" role="radiogroup" aria-label="Rol">
            <button
              type="button"
              className={`users-role-opt ${role === "USER" ? "on" : ""}`}
              aria-pressed={role === "USER"}
              onClick={() => setRole("USER")}
            >
              Usuario
            </button>
            <button
              type="button"
              className={`users-role-opt users-role-opt--admin ${role === "ADMIN" ? "on" : ""}`}
              aria-pressed={role === "ADMIN"}
              onClick={() => setRole("ADMIN")}
            >
              Admin
            </button>
          </div>

          {role === "ADMIN" && (
            <p className="folder-modal-hint">Tendrá control total de usuarios y datos.</p>
          )}

          <div className="confirm-actions">
            <button type="button" className="btn" disabled={saving} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn primary" disabled={!canSubmit}>
              {saving ? "Creando…" : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
