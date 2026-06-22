import {
  Copy,
  MoreHorizontal,
  Pencil,
  Presentation,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { formatDateCompact } from "../api";
import ConfirmDialog from "../ConfirmDialog";
import {
  deletePresentationSession,
  duplicateSession,
  listSessions,
  renameSessionTitle,
} from "./storage";
import type { PresentationSession } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenSession: (session: PresentationSession) => void;
};

type RowMenuState = { sessionId: string; x: number; y: number } | null;

export default function PresentationSessionsDialog({
  open,
  onClose,
  onOpenSession,
}: Props) {
  const [sessions, setSessions] = useState<PresentationSession[]>([]);
  const [rowMenu, setRowMenu] = useState<RowMenuState>(null);
  const [deleteTarget, setDeleteTarget] = useState<PresentationSession | null>(null);
  const [renameTarget, setRenameTarget] = useState<PresentationSession | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    setSessions(listSessions());
  }, []);

  useEffect(() => {
    if (!open) return;
    refresh();
    setRowMenu(null);
    setDeleteTarget(null);
    setRenameTarget(null);
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !deleteTarget && !renameTarget) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, deleteTarget, renameTarget]);

  useEffect(() => {
    if (!renameTarget) return;
    setRenameDraft(renameTarget.title);
    const t = window.setTimeout(() => renameInputRef.current?.select(), 50);
    return () => window.clearTimeout(t);
  }, [renameTarget]);

  useEffect(() => {
    if (!rowMenu) return;
    function closeMenu() {
      setRowMenu(null);
    }
    window.addEventListener("mousedown", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("mousedown", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [rowMenu]);

  if (!open) return null;

  const menuSession = rowMenu ? sessions.find((s) => s.id === rowMenu.sessionId) : null;

  function startRename(session: PresentationSession) {
    setRowMenu(null);
    setRenameTarget(session);
  }

  function handleDuplicate(session: PresentationSession) {
    setRowMenu(null);
    duplicateSession(session.id);
    refresh();
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deletePresentationSession(deleteTarget.id);
    setDeleteTarget(null);
    refresh();
  }

  function submitRename(e: FormEvent) {
    e.preventDefault();
    if (!renameTarget) return;
    const updated = renameSessionTitle(renameTarget.id, renameDraft);
    if (updated) refresh();
    setRenameTarget(null);
  }

  function openRowMenu(e: React.MouseEvent, sessionId: string) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const panelW = 180;
    const left = Math.max(8, Math.min(rect.right - panelW, window.innerWidth - panelW - 8));
    setRowMenu({ sessionId, x: left, y: rect.bottom + 4 });
  }

  return (
    <>
      <div className="confirm-backdrop" role="presentation" onClick={onClose}>
        <div
          className="sessions-dialog-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sessions-dialog-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="sessions-dialog-header">
            <div className="sessions-dialog-header-text">
              <Presentation size={20} strokeWidth={2} aria-hidden className="sessions-dialog-icon" />
              <h2 id="sessions-dialog-title" className="sessions-dialog-title">
                Mis sesiones
              </h2>
            </div>
            <button
              type="button"
              className="sessions-dialog-close"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <X size={18} strokeWidth={2.25} />
            </button>
          </header>

          {sessions.length === 0 ? (
            <div className="sessions-dialog-empty">
              <Presentation size={36} strokeWidth={1.5} aria-hidden />
              <p>Aún no tienes sesiones.</p>
              <p className="sessions-dialog-empty-hint">
                Selecciona PDFs y usa <strong>Crear sesión</strong>.
              </p>
            </div>
          ) : (
            <ul className="sessions-dialog-list" aria-label="Sesiones guardadas">
              {sessions.map((session) => {
                const docCount = session.items.length;
                const docLabel = `${docCount} documento${docCount === 1 ? "" : "s"}`;
                return (
                  <li key={session.id} className="sessions-dialog-row-wrap">
                    <button
                      type="button"
                      className="sessions-dialog-row"
                      onClick={() => onOpenSession(session)}
                    >
                      <span className="sessions-dialog-row-main">
                        <span className="sessions-dialog-row-title" title={session.title}>
                          {session.title}
                        </span>
                        {session.subtitle ? (
                          <span className="sessions-dialog-row-subtitle" title={session.subtitle}>
                            {session.subtitle}
                          </span>
                        ) : null}
                        <span className="sessions-dialog-row-meta">
                          {docLabel} · {formatDateCompact(session.updatedAt)}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="sessions-dialog-row-menu-btn"
                      onClick={(e) => openRowMenu(e, session.id)}
                      aria-label={`Acciones de ${session.title}`}
                      aria-haspopup="menu"
                    >
                      <MoreHorizontal size={18} strokeWidth={2.25} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {rowMenu && menuSession && (
        <div
          className="sessions-dialog-context-menu"
          style={{ left: rowMenu.x, top: rowMenu.y }}
          role="menu"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button type="button" role="menuitem" onClick={() => startRename(menuSession)}>
            <Pencil size={15} strokeWidth={2} aria-hidden />
            Renombrar
          </button>
          <button type="button" role="menuitem" onClick={() => handleDuplicate(menuSession)}>
            <Copy size={15} strokeWidth={2} aria-hidden />
            Duplicar
          </button>
          <button
            type="button"
            role="menuitem"
            className="danger"
            onClick={() => {
              setRowMenu(null);
              setDeleteTarget(menuSession);
            }}
          >
            <Trash2 size={15} strokeWidth={2} aria-hidden />
            Eliminar…
          </button>
        </div>
      )}

      {renameTarget && (
        <div
          className="confirm-backdrop sessions-dialog-rename-backdrop"
          role="presentation"
          onClick={() => setRenameTarget(null)}
        >
          <div
            className="folder-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-rename-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="folder-modal-header">
              <h2 id="session-rename-title" className="folder-modal-title">
                Renombrar sesión
              </h2>
              <button
                type="button"
                className="folder-modal-close"
                aria-label="Cerrar"
                onClick={() => setRenameTarget(null)}
              >
                ×
              </button>
            </header>
            <form onSubmit={submitRename}>
              <label className="folder-modal-label" htmlFor="session-rename-input">
                Título
              </label>
              <input
                id="session-rename-input"
                ref={renameInputRef}
                className="folder-modal-input"
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                maxLength={120}
                autoComplete="off"
              />
              <div className="confirm-actions">
                <button type="button" className="btn" onClick={() => setRenameTarget(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn primary" disabled={!renameDraft.trim()}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget != null}
        title="¿Eliminar sesión?"
        message={
          deleteTarget
            ? `Vas a eliminar «${deleteTarget.title}». Esta acción no se puede deshacer.`
            : ""
        }
        cancelLabel="Cancelar"
        confirmLabel="Eliminar"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
