import { useCallback, useEffect, useState } from "react";
import {
  addSpaceworkFile,
  addSpaceworkLink,
  isSessionExpired,
  listSpaceworkProjects,
  ProjectRole,
  SpaceworkProject,
} from "./api";

type Props = {
  open: boolean;
  fileId?: number;
  linkId?: number;
  onClose: () => void;
  onAdded?: (projectName: string) => void;
  onError: (msg: string) => void;
  onSessionLost: () => void;
};

function canAddToProject(role: ProjectRole) {
  return role !== "VIEWER";
}

export default function AddToSpaceworkDialog({
  open,
  fileId,
  linkId,
  onClose,
  onAdded,
  onError,
  onSessionLost,
}: Props) {
  const [projects, setProjects] = useState<SpaceworkProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);

  const handleErr = useCallback(
    (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Error";
      if (isSessionExpired(msg)) {
        onSessionLost();
        return;
      }
      onError(msg);
    },
    [onError, onSessionLost],
  );

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void listSpaceworkProjects()
      .then((rows) => setProjects(rows.filter((p) => canAddToProject(p.myRole))))
      .catch(handleErr)
      .finally(() => setLoading(false));
  }, [open, handleErr]);

  async function pickProject(project: SpaceworkProject) {
    setAddingId(project.id);
    try {
      if (fileId != null) {
        await addSpaceworkFile(project.id, fileId);
      } else if (linkId != null) {
        await addSpaceworkLink(project.id, linkId);
      } else {
        throw new Error("Nada que enlazar");
      }
      onAdded?.(project.name);
      onClose();
    } catch (err) {
      handleErr(err);
    } finally {
      setAddingId(null);
    }
  }

  if (!open) return null;

  const title = fileId != null ? "Añadir archivo a Spacework" : "Añadir enlace a Spacework";

  return (
    <div className="confirm-backdrop" role="presentation" onClick={onClose}>
      <div className="confirm-card spacework-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="confirm-title">{title}</h2>
        <p className="muted">El archivo no se duplica; solo se enlaza al proyecto.</p>
        {loading ? (
          <p>Cargando proyectos…</p>
        ) : projects.length === 0 ? (
          <p className="muted">
            No tienes proyectos donde puedas añadir elementos. Crea uno en Spacework o pide acceso
            de miembro.
          </p>
        ) : (
          <ul className="spacework-picker-list">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="spacework-picker-item"
                  disabled={addingId != null}
                  onClick={() => void pickProject(p)}
                >
                  <span className="spacework-picker-item__name">{p.name}</span>
                  <span className="spacework-picker-item__meta">
                    {p.itemCount} elementos · {addingId === p.id ? "Enlazando…" : "Elegir"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="confirm-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
