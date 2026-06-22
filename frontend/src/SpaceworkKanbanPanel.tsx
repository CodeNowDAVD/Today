import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BoardColumn,
  BoardTask,
  completeSpaceworkBoardTask,
  createSpaceworkBoardColumn,
  createSpaceworkBoardTask,
  deleteSpaceworkBoardTask,
  isSessionExpired,
  LifeContact,
  listLifeContacts,
  listLifeTaskContacts,
  listSpaceworkBoard,
  ProjectRole,
  setLifeTaskContacts,
  SpaceworkMember,
  updateSpaceworkBoardTask,
} from "./api";
import LifeTagInput from "./life/LifeTagInput";
import { subscribeSpaceworkBoardStream, upsertTask } from "./spaceworkBoardStream";
import { formatTaskDueShort, taskDueBadge } from "./spaceworkTaskDue";
import { SpaceworkLiveBadge, SpaceworkLoading } from "./spaceworkUi";

type ProjectFile = { id: number; name: string };

type Props = {
  projectId: number;
  myRole: ProjectRole;
  members: SpaceworkMember[];
  projectFiles: ProjectFile[];
  lifeFeatures?: boolean;
  initialTaskId?: number | null;
  onInitialTaskConsumed?: () => void;
  onSessionLost: () => void;
  onError: (msg: string) => void;
};

export default function SpaceworkKanbanPanel({
  projectId,
  myRole,
  members,
  projectFiles,
  lifeFeatures = false,
  initialTaskId = null,
  onInitialTaskConsumed,
  onSessionLost,
  onError,
}: Props) {
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveConnected, setLiveConnected] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [creatingCol, setCreatingCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [dragTaskId, setDragTaskId] = useState<number | null>(null);
  const [detailTask, setDetailTask] = useState<BoardTask | null>(null);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailDescription, setDetailDescription] = useState("");
  const [detailAssigneeId, setDetailAssigneeId] = useState<string>("");
  const [detailLinkedFileId, setDetailLinkedFileId] = useState<string>("");
  const [detailDueAt, setDetailDueAt] = useState("");
  const [detailTags, setDetailTags] = useState("");
  const [detailContactIds, setDetailContactIds] = useState<number[]>([]);
  const [allContacts, setAllContacts] = useState<LifeContact[]>([]);
  const [savingDetail, setSavingDetail] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const canEdit = myRole !== "VIEWER";
  const canManageColumns = myRole === "OWNER" || myRole === "ADMIN";

  const tasksByColumn = useMemo(() => {
    const visible = showCompleted ? tasks : tasks.filter((t) => !t.completedAt);
    const map = new Map<number, BoardTask[]>();
    for (const col of columns) map.set(col.id, []);
    for (const task of visible) {
      const list = map.get(task.columnId);
      if (list) list.push(task);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
        if (a.dueAt) return -1;
        if (b.dueAt) return 1;
        return a.position - b.position;
      });
    }
    return map;
  }, [columns, tasks, showCompleted]);

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

  const load = useCallback(async () => {
    try {
      const board = await listSpaceworkBoard(projectId);
      setColumns(board.columns);
      setTasks(board.tasks);
    } catch (err) {
      handleErr(err);
    } finally {
      setLoading(false);
    }
  }, [projectId, handleErr]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (initialTaskId == null || loading || tasks.length === 0) return;
    const task = tasks.find((t) => t.id === initialTaskId);
    if (task) {
      setDetailTask(task);
      onInitialTaskConsumed?.();
    }
  }, [initialTaskId, loading, tasks, onInitialTaskConsumed]);

  useEffect(() => {
    setLiveConnected(false);
    const stop = subscribeSpaceworkBoardStream(
      projectId,
      (task) => setTasks((prev) => upsertTask(prev, task)),
      (taskId) => setTasks((prev) => prev.filter((t) => t.id !== taskId)),
      (msg) => {
        setLiveConnected(false);
        if (isSessionExpired(msg)) onSessionLost();
      },
      () => setLiveConnected(true),
    );
    return () => {
      stop();
      setLiveConnected(false);
    };
  }, [projectId, onSessionLost]);

  useEffect(() => {
    if (liveConnected) return;
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, [liveConnected, load]);

  useEffect(() => {
    if (!detailTask) return;
    setDetailTitle(detailTask.title);
    setDetailDescription(detailTask.description ?? "");
    setDetailAssigneeId(detailTask.assigneeUserId != null ? String(detailTask.assigneeUserId) : "");
    setDetailLinkedFileId(detailTask.linkedFileId != null ? String(detailTask.linkedFileId) : "");
    setDetailDueAt(detailTask.dueAt ? detailTask.dueAt.slice(0, 16) : "");
    setDetailTags((detailTask.tags ?? []).join(", "));
    if (!lifeFeatures) {
      setDetailContactIds([]);
      return;
    }
    void (async () => {
      try {
        const [contacts, linked] = await Promise.all([
          listLifeContacts(),
          listLifeTaskContacts(detailTask.id),
        ]);
        setAllContacts(contacts);
        setDetailContactIds(linked.map((c) => c.id));
      } catch (err) {
        handleErr(err);
      }
    })();
  }, [detailTask, lifeFeatures, handleErr]);

  async function handleCreateTask(e: FormEvent, columnId: number) {
    e.preventDefault();
    const title = (drafts[columnId] ?? "").trim();
    if (!canEdit || !title) return;
    try {
      const created = await createSpaceworkBoardTask(projectId, columnId, title);
      setDrafts((prev) => ({ ...prev, [columnId]: "" }));
      setTasks((prev) => upsertTask(prev, created));
    } catch (err) {
      handleErr(err);
    }
  }

  async function handleCreateColumn(e: FormEvent) {
    e.preventDefault();
    if (!canManageColumns || !newColName.trim()) return;
    setCreatingCol(true);
    try {
      const col = await createSpaceworkBoardColumn(projectId, newColName.trim());
      setColumns((prev) => [...prev, col].sort((a, b) => a.position - b.position));
      setNewColName("");
    } catch (err) {
      handleErr(err);
    } finally {
      setCreatingCol(false);
    }
  }

  async function handleDrop(columnId: number, position: number) {
    if (dragTaskId == null || !canEdit) return;
    const task = tasks.find((t) => t.id === dragTaskId);
    if (!task) return;
    if (task.columnId === columnId && task.position === position) return;
    try {
      const updated = await updateSpaceworkBoardTask(projectId, dragTaskId, {
        columnId,
        position,
      });
      setTasks((prev) => upsertTask(prev, updated));
    } catch (err) {
      handleErr(err);
    } finally {
      setDragTaskId(null);
    }
  }

  async function handleAssigneeChange(task: BoardTask, value: string) {
    if (!canEdit) return;
    try {
      const updated = await updateSpaceworkBoardTask(
        projectId,
        task.id,
        value === "" ? { clearAssignee: true } : { assigneeUserId: Number(value) },
      );
      setTasks((prev) => upsertTask(prev, updated));
    } catch (err) {
      handleErr(err);
    }
  }

  async function handleToggleComplete(task: BoardTask) {
    if (!canEdit) return;
    try {
      const updated = await completeSpaceworkBoardTask(
        projectId,
        task.id,
        !task.completedAt,
      );
      setTasks((prev) => upsertTask(prev, updated));
      if (detailTask?.id === task.id) setDetailTask(updated);
    } catch (err) {
      handleErr(err);
    }
  }

  async function handleDelete(taskId: number) {
    try {
      await deleteSpaceworkBoardTask(projectId, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (detailTask?.id === taskId) setDetailTask(null);
    } catch (err) {
      handleErr(err);
    }
  }

  async function handleSaveDetail(e: FormEvent) {
    e.preventDefault();
    if (!detailTask || !canEdit) return;
    const title = detailTitle.trim();
    if (!title) return;
    setSavingDetail(true);
    try {
      const patch: Parameters<typeof updateSpaceworkBoardTask>[2] = {
        title,
        description: detailDescription.trim() || "",
      };
      if (detailAssigneeId === "") {
        patch.clearAssignee = true;
      } else {
        patch.assigneeUserId = Number(detailAssigneeId);
      }
      if (detailLinkedFileId === "") {
        patch.clearLinkedFile = true;
      } else {
        patch.linkedFileId = Number(detailLinkedFileId);
      }
      if (detailDueAt === "") {
        patch.clearDueAt = true;
      } else {
        patch.dueAt = new Date(detailDueAt).toISOString();
      }
      patch.tags = detailTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const updated = await updateSpaceworkBoardTask(projectId, detailTask.id, patch);
      if (lifeFeatures) {
        await setLifeTaskContacts(detailTask.id, detailContactIds);
      }
      setTasks((prev) => upsertTask(prev, updated));
      setDetailTask(updated);
    } catch (err) {
      handleErr(err);
    } finally {
      setSavingDetail(false);
    }
  }

  if (loading) {
    return <SpaceworkLoading label="Cargando tablero…" />;
  }

  return (
    <div className="spacework-kanban">
      <header className="spacework-kanban__head pad-sm">
        <h2 className="spacework-kanban__title">
          Tareas
          {liveConnected ? <SpaceworkLiveBadge /> : null}
        </h2>
        <label className="spacework-kanban__show-done muted">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          Mostrar completadas
        </label>
        {canManageColumns && (
          <form className="spacework-kanban__new-col" onSubmit={(e) => void handleCreateColumn(e)}>
            <input
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="Nueva columna…"
              maxLength={80}
            />
            <button type="submit" className="btn sm" disabled={creatingCol || !newColName.trim()}>
              {creatingCol ? "…" : "Añadir"}
            </button>
          </form>
        )}
      </header>

      <div className="spacework-kanban__board" role="list">
        {columns.map((col) => {
          const colTasks = tasksByColumn.get(col.id) ?? [];
          return (
            <section
              key={col.id}
              className="spacework-kanban__column"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void handleDrop(col.id, colTasks.length);
              }}
            >
              <header className="spacework-kanban__column-head">
                <span className="spacework-kanban__column-name">{col.name}</span>
                <span className="muted">{colTasks.length}</span>
              </header>

              <ul className="spacework-kanban__cards">
                {colTasks.map((task, index) => (
                  <li
                    key={task.id}
                    className={[
                      "spacework-kanban__card",
                      dragTaskId === task.id && "spacework-kanban__card--dragging",
                      task.completedAt && "spacework-kanban__card--done",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    draggable={canEdit}
                    onDragStart={() => setDragTaskId(task.id)}
                    onDragEnd={() => setDragTaskId(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void handleDrop(col.id, index);
                    }}
                  >
                    <div className="spacework-kanban__card-top">
                      {canEdit && (
                        <input
                          type="checkbox"
                          className="spacework-kanban__card-check"
                          checked={Boolean(task.completedAt)}
                          aria-label={`Marcar ${task.title} como hecha`}
                          onChange={() => void handleToggleComplete(task)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <button
                        type="button"
                        className="spacework-kanban__card-title-btn"
                        onClick={() => setDetailTask(task)}
                      >
                        {task.title}
                      </button>
                    </div>
                    {task.dueAt && (
                      <span
                        className={[
                          "spacework-kanban__due",
                          `spacework-kanban__due--${taskDueBadge(task.dueAt, task.completedAt)}`,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {formatTaskDueShort(task.dueAt)}
                      </span>
                    )}
                    {task.linkedFileName ? (
                      <span className="spacework-kanban__card-file muted" title={task.linkedFileName}>
                        📎 {task.linkedFileName}
                      </span>
                    ) : null}
                    {canEdit ? (
                      <select
                        className="spacework-kanban__card-assignee-select"
                        value={task.assigneeUserId ?? ""}
                        onChange={(e) => void handleAssigneeChange(task, e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        aria-label="Responsable"
                      >
                        <option value="">Sin asignar</option>
                        {members.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            @{m.username}
                          </option>
                        ))}
                      </select>
                    ) : task.assigneeUsername ? (
                      <span className="spacework-kanban__card-assignee">@{task.assigneeUsername}</span>
                    ) : null}
                    {canEdit && (
                      <button
                        type="button"
                        className="spacework-kanban__card-delete btn ghost sm danger"
                        onClick={() => void handleDelete(task.id)}
                        aria-label="Eliminar tarea"
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {canEdit && (
                <form
                  className="spacework-kanban__add"
                  onSubmit={(e) => void handleCreateTask(e, col.id)}
                >
                  <input
                    value={drafts[col.id] ?? ""}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [col.id]: e.target.value }))
                    }
                    placeholder="Nueva tarea…"
                    maxLength={200}
                  />
                  <button type="submit" className="btn ghost sm" disabled={!(drafts[col.id] ?? "").trim()}>
                    +
                  </button>
                </form>
              )}
            </section>
          );
        })}
      </div>

      {detailTask && (
        <div className="spacework-kanban-detail-backdrop" onClick={() => setDetailTask(null)}>
          <form
            className="spacework-kanban-detail"
            onSubmit={(e) => void handleSaveDetail(e)}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="spacework-kanban-detail__head">
              <h3>Detalle de tarea</h3>
              <button type="button" className="btn ghost sm" onClick={() => setDetailTask(null)}>
                Cerrar
              </button>
            </header>
            <label className="spacework-kanban-detail__field">
              <span>Título</span>
              <input
                value={detailTitle}
                onChange={(e) => setDetailTitle(e.target.value)}
                maxLength={200}
                readOnly={!canEdit}
              />
            </label>
            <label className="spacework-kanban-detail__field">
              <span>Descripción</span>
              <textarea
                value={detailDescription}
                onChange={(e) => setDetailDescription(e.target.value)}
                maxLength={1000}
                rows={4}
                readOnly={!canEdit}
              />
            </label>
            <label className="spacework-kanban-detail__field">
              <span>Responsable</span>
              <select
                value={detailAssigneeId}
                onChange={(e) => setDetailAssigneeId(e.target.value)}
                disabled={!canEdit}
              >
                <option value="">Sin asignar</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    @{m.username}
                  </option>
                ))}
              </select>
            </label>
            <label className="spacework-kanban-detail__field">
              <span>Archivo del proyecto</span>
              <select
                value={detailLinkedFileId}
                onChange={(e) => setDetailLinkedFileId(e.target.value)}
                disabled={!canEdit}
              >
                <option value="">Ninguno</option>
                {projectFiles.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="spacework-kanban-detail__field">
              <span>Fecha límite</span>
              <input
                type="datetime-local"
                value={detailDueAt}
                onChange={(e) => setDetailDueAt(e.target.value)}
                disabled={!canEdit}
              />
            </label>
            <label className="spacework-kanban-detail__field">
              <span>Tags (separados por coma)</span>
              {lifeFeatures ? (
                <LifeTagInput value={detailTags} onChange={setDetailTags} readOnly={!canEdit} />
              ) : (
                <input
                  value={detailTags}
                  onChange={(e) => setDetailTags(e.target.value)}
                  placeholder="curso:algebra, contexto:casa"
                  readOnly={!canEdit}
                />
              )}
            </label>
            {lifeFeatures && (
              <div className="spacework-kanban-detail__field">
                <span>Personas vinculadas</span>
                {allContacts.length === 0 ? (
                  <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.8125rem" }}>
                    Crea contactos en Vida → Personas
                  </p>
                ) : (
                  <div className="life-contact-picks">
                    {allContacts.map((c) => (
                      <label key={c.id}>
                        <input
                          type="checkbox"
                          checked={detailContactIds.includes(c.id)}
                          disabled={!canEdit}
                          onChange={(e) => {
                            setDetailContactIds((prev) =>
                              e.target.checked
                                ? [...prev, c.id]
                                : prev.filter((id) => id !== c.id),
                            );
                          }}
                        />
                        <span>
                          {c.name}
                          {c.roleLabel ? ` · ${c.roleLabel}` : ""}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
            {canEdit && (
              <footer className="spacework-kanban-detail__foot">
                <button type="submit" className="btn sm" disabled={savingDetail || !detailTitle.trim()}>
                  {savingDetail ? "Guardando…" : "Guardar"}
                </button>
              </footer>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
