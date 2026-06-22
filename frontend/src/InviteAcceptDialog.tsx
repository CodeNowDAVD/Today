import { useEffect, useState } from "react";
import {
  acceptInvitation,
  InvitationPreview,
  isSessionExpired,
  previewInvitation,
  SpaceworkInvitation,
  acceptMyProjectInvitation,
  declineMyProjectInvitation,
  listMyProjectInvitations,
} from "./api";

type Props = {
  inviteToken: string | null;
  onClose: () => void;
  onAccepted: (projectId: number) => void;
  onSessionLost: () => void;
  onError: (msg: string) => void;
};

export function InviteAcceptDialog({
  inviteToken,
  onClose,
  onAccepted,
  onSessionLost,
  onError,
}: Props) {
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [pending, setPending] = useState<SpaceworkInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [pendingLoaded, setPendingLoaded] = useState(false);

  useEffect(() => {
    if (inviteToken) {
      setLoading(true);
      void previewInvitation(inviteToken)
        .then(setPreview)
        .catch((err) => onError(err instanceof Error ? err.message : "Invitación inválida"))
        .finally(() => setLoading(false));
      return;
    }
    setPendingLoaded(false);
    void listMyProjectInvitations()
      .then((rows) => {
        setPending(rows);
        setPendingLoaded(true);
      })
      .catch(() => {
        setPending([]);
        setPendingLoaded(true);
      });
  }, [inviteToken, onError]);

  if (!inviteToken && pendingLoaded && pending.length === 0) return null;

  async function handleAcceptToken() {
    if (!inviteToken) return;
    setActing(true);
    try {
      const res = await acceptInvitation(inviteToken);
      onAccepted(res.projectId);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      if (isSessionExpired(msg)) onSessionLost();
      else onError(msg);
    } finally {
      setActing(false);
    }
  }

  async function handleAcceptId(id: number, projectId: number) {
    setActing(true);
    try {
      await acceptMyProjectInvitation(id);
      onAccepted(projectId);
      setPending((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error");
    } finally {
      setActing(false);
    }
  }

  async function handleDeclineId(id: number) {
    setActing(true);
    try {
      await declineMyProjectInvitation(id);
      setPending((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo rechazar la invitación");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="confirm-backdrop" role="presentation" onClick={onClose}>
      <div className="confirm-card spacework-modal" onClick={(e) => e.stopPropagation()}>
        {inviteToken ? (
          <>
            <h2>Invitación a proyecto</h2>
            {loading ? (
              <p className="muted">Cargando…</p>
            ) : preview ? (
              <>
                <p>
                  <strong>{preview.inviterUsername}</strong> te invita a{" "}
                  <strong>{preview.projectName}</strong> como {preview.role}.
                </p>
                {preview.expired ? (
                  <p className="alert error">Esta invitación expiró.</p>
                ) : (
                  <div className="confirm-actions">
                    <button type="button" className="btn" onClick={onClose}>
                      Cerrar
                    </button>
                    <button
                      type="button"
                      className="btn primary"
                      disabled={acting}
                      onClick={() => void handleAcceptToken()}
                    >
                      {acting ? "…" : "Aceptar"}
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </>
        ) : (
          <>
            <h2>Invitaciones pendientes</h2>
            {!pendingLoaded ? (
              <p className="muted">Cargando…</p>
            ) : (
            <ul className="spacework-invite-list">
              {pending.map((inv) => (
                <li key={inv.id} className="spacework-invite-row">
                  <span>
                    {inv.projectName} · {inv.role} · {inv.inviterUsername}
                  </span>
                  <div style={{ display: "flex", gap: "0.35rem" }}>
                    <button
                      type="button"
                      className="btn primary sm"
                      disabled={acting}
                      onClick={() => void handleAcceptId(inv.id, inv.projectId)}
                    >
                      Aceptar
                    </button>
                    <button
                      type="button"
                      className="btn ghost sm"
                      disabled={acting}
                      onClick={() => void handleDeclineId(inv.id)}
                    >
                      Rechazar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            )}
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
