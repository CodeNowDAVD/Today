import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  archiveLifeWorkspace,
  completeLifeTask,
  createLifeContact,
  createLifeWorkspace,
  createSpaceworkBoardTask,
  updateSpaceworkBoardTask,
  deleteLifeContact,
  deleteLifeInbox,
  formatDateCompact,
  getLifeContactLinked,
  getLifeToday,
  isSessionExpired,
  DEFAULT_APP_TIMEZONE,
  LifeContact,
  LifeInboxItem,
  LifeTaskSummary,
  LifeToday,
  LifeWorkspace,
  listLifeContacts,
  listLifeInbox,
  listLifeTasks,
  listLifeWorkspaces,
  listSpaceworkBoard,
  listSpaceworkItems,
  listSpaceworkMembers,
  patchLifeInbox,
  promoteLifeWorkspace,
  ProjectRole,
  SpaceworkMember,
} from "../api";
import LifeTagInput from "./LifeTagInput";
import QuickAddBar from "./QuickAddBar";
import SpaceworkKanbanPanel from "../SpaceworkKanbanPanel";
import SpaceworkWikiPanel from "../SpaceworkWikiPanel";
import WorkspaceChrome from "../WorkspaceChrome";
import {
  lifeListTaskDueDisplay,
  lifeTodayTaskDueDisplay,
  sortTasksForTodayWidget,
  type LifeTodaySection,
} from "./lifeTaskDueDisplay";
import type { LifeNavTarget } from "../lifeNav";
import type { LifeView } from "../lifeNav";

const SUBNAV: { id: LifeView; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "inbox", label: "Captura" },
  { id: "workspaces", label: "Espacios" },
  { id: "contacts", label: "Personas" },
];

/** Filtros del cockpit Hoy. "foco" = el panel de hoy; el resto = lista plana. */
type CockpitFilter = "foco" | "all" | "today" | "overdue" | "upcoming";
const COCKPIT_FILTERS: { id: CockpitFilter; label: string }[] = [
  { id: "foco", label: "Foco" },
  { id: "today", label: "Hoy" },
  { id: "overdue", label: "Vencidas" },
  { id: "upcoming", label: "7 días" },
  { id: "all", label: "Todas" },
];

type Props = {
  sessionUsername: string;
  navTarget?: LifeNavTarget | null;
  onNavConsumed?: () => void;
  onSessionLost: () => void;
  onError: (msg: string) => void;
  onInboxChange?: () => void;
};

export type RescheduleWhen = "today" | "tomorrow" | "+3";

function TaskRow({
  task,
  onComplete,
  onOpen,
  onReschedule,
  onSnooze,
  onRename,
  todaySection,
  timezone,
}: {
  task: LifeTaskSummary;
  onComplete: (task: LifeTaskSummary) => void;
  onOpen?: (task: LifeTaskSummary) => void;
  onReschedule: (task: LifeTaskSummary, when: RescheduleWhen) => void;
  onSnooze: (task: LifeTaskSummary, days: number) => void;
  onRename: (task: LifeTaskSummary, title: string) => void;
  todaySection?: LifeTodaySection;
  timezone?: string;
}) {
  const due = todaySection
    ? lifeTodayTaskDueDisplay(task, todaySection, timezone)
    : lifeListTaskDueDisplay(task, timezone);
  const completed = Boolean(task.completedAt);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  function startEdit() {
    setDraft(task.title);
    setEditing(true);
  }
  function commitEdit() {
    const t = draft.trim();
    setEditing(false);
    if (t && t !== task.title) onRename(task, t);
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLElement>) {
    if (editing) return;
    const el = e.target as HTMLElement;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return;
    const k = e.key.toLowerCase();
    if (k === "x") {
      if (!completed) onComplete(task);
    } else if (k === "e") {
      e.preventDefault();
      startEdit();
    } else if (e.key === "1") onReschedule(task, "today");
    else if (e.key === "2") onReschedule(task, "tomorrow");
    else if (e.key === "3") onReschedule(task, "+3");
    else return;
    e.stopPropagation();
  }

  return (
    <article
      className={["life-task-row", `life-task-row--stripe-${due.kind}`].filter(Boolean).join(" ")}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <input
        type="checkbox"
        className="life-task-row__check"
        aria-label={`Marcar ${task.title} como hecha`}
        checked={completed}
        disabled={completed}
        onChange={() => onComplete(task)}
      />
      {editing ? (
        <input
          className="life-task-row__edit"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitEdit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="life-task-row__body"
          onClick={() => onOpen?.(task)}
          onDoubleClick={(e) => {
            e.preventDefault();
            startEdit();
          }}
        >
          <div className="life-task-row__head">
            <span className="life-task-row__title">{task.title}</span>
            {due.label && (
              <span
                className={[
                  "life-task-due",
                  due.kind === "overdue" && "life-task-due--overdue",
                  due.kind === "today" && "life-task-due--today",
                  due.kind === "soon" && "life-task-due--soon",
                  due.kind === "calm" && "life-task-due--calm",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {due.label}
              </span>
            )}
          </div>
          <div className="life-task-row__foot">
            <span className="life-task-row__workspace">{task.workspaceName}</span>
            {task.columnName && <span className="life-task-row__column">{task.columnName}</span>}
          </div>
          {task.tags.length > 0 && (
            <span className="life-task-row__tags">
              {task.tags.map((t) => (
                <span key={t} className="life-tag">
                  {t}
                </span>
              ))}
            </span>
          )}
        </button>
      )}
      {!completed && !editing && (
        <div className="life-task-row__actions" role="group" aria-label="Acciones rápidas">
          <button type="button" title="Reprogramar a hoy (1)" onClick={() => onReschedule(task, "today")}>
            Hoy
          </button>
          <button
            type="button"
            title="Reprogramar a mañana (2)"
            onClick={() => onReschedule(task, "tomorrow")}
          >
            Mañana
          </button>
          <button type="button" title="Posponer 1 semana" onClick={() => onSnooze(task, 7)}>
            +7d
          </button>
          <button type="button" title="Editar título (e)" aria-label="Editar" onClick={startEdit}>
            ✎
          </button>
        </div>
      )}
    </article>
  );
}

export default function LifePanel({
  sessionUsername,
  navTarget,
  onNavConsumed,
  onSessionLost,
  onError,
  onInboxChange,
}: Props) {
  const [view, setView] = useState<LifeView>("today");
  const [today, setToday] = useState<LifeToday | null>(null);
  const [appTimezone, setAppTimezone] = useState<string | undefined>();
  const [tasks, setTasks] = useState<LifeTaskSummary[]>([]);
  const [taskFilter, setTaskFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [inbox, setInbox] = useState<LifeInboxItem[]>([]);
  const [workspaces, setWorkspaces] = useState<LifeWorkspace[]>([]);
  const [contacts, setContacts] = useState<LifeContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [openWorkspaceId, setOpenWorkspaceId] = useState<number | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<number | null>(null);
  const [highlightInboxId, setHighlightInboxId] = useState<number | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<"tasks" | "wiki">("tasks");
  const [wsMembers, setWsMembers] = useState<SpaceworkMember[]>([]);
  const [wsFiles, setWsFiles] = useState<{ id: number; name: string }[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [contactDetail, setContactDetail] = useState<Awaited<ReturnType<typeof getLifeContactLinked>> | null>(
    null,
  );

  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsTemplate, setNewWsTemplate] = useState("ACADEMIC_COURSE");
  const [createContactOpen, setCreateContactOpen] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [convertItem, setConvertItem] = useState<LifeInboxItem | null>(null);
  const [moveItem, setMoveItem] = useState<LifeInboxItem | null>(null);
  const [convertTitle, setConvertTitle] = useState("");
  const [convertWorkspaceId, setConvertWorkspaceId] = useState<number | "">("");
  const [convertDueAt, setConvertDueAt] = useState("");
  const [moveWorkspaceId, setMoveWorkspaceId] = useState<number | "">("");
  const [inboxActing, setInboxActing] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskWorkspaceId, setNewTaskWorkspaceId] = useState<number | "">("");
  const [newTaskDueAt, setNewTaskDueAt] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [quickBusy, setQuickBusy] = useState(false);
  const [cockpitFilter, setCockpitFilter] = useState<CockpitFilter>("foco");
  const quickRef = useRef<HTMLInputElement>(null);

  const loadToday = useCallback(async () => {
    const data = await getLifeToday();
    setToday(data);
    setAppTimezone(data.meta?.timezone ?? DEFAULT_APP_TIMEZONE);
  }, []);

  const loadTasks = useCallback(async () => {
    const data = await listLifeTasks(taskFilter, tagFilter || undefined);
    setTasks(data);
  }, [taskFilter, tagFilter]);

  const loadInbox = useCallback(async () => {
    setInbox(await listLifeInbox());
  }, []);

  const loadWorkspaces = useCallback(async () => {
    setWorkspaces(await listLifeWorkspaces());
  }, []);

  const loadContacts = useCallback(async () => {
    setContacts(await listLifeContacts());
  }, []);

  useEffect(() => {
    if (!navTarget) return;
    setView(navTarget.view);
    if (navTarget.workspaceId) {
      setOpenWorkspaceId(navTarget.workspaceId);
      setView("workspaces");
    }
    if (navTarget.taskId) {
      setPendingTaskId(navTarget.taskId);
      if (navTarget.workspaceId) {
        setOpenWorkspaceId(navTarget.workspaceId);
        setWorkspaceTab("tasks");
        setView("workspaces");
      } else {
        setView("tasks");
      }
    }
    if (navTarget.inboxId) {
      setHighlightInboxId(navTarget.inboxId);
      setView("inbox");
    }
    if (navTarget.contactId) {
      setSelectedContactId(navTarget.contactId);
      setView("contacts");
    }
    onNavConsumed?.();
  }, [navTarget, onNavConsumed]);

  useEffect(() => {
    if (!openWorkspaceId) {
      setWsMembers([]);
      setWsFiles([]);
      return;
    }
    void (async () => {
      try {
        const [members, items] = await Promise.all([
          listSpaceworkMembers(openWorkspaceId),
          listSpaceworkItems(openWorkspaceId),
        ]);
        setWsMembers(members);
        setWsFiles(
          items
            .filter((i) => i.fileId != null)
            .map((i) => ({ id: i.fileId!, name: i.fileName || "Archivo" })),
        );
      } catch {
        setWsMembers([]);
        setWsFiles([]);
      }
    })();
  }, [openWorkspaceId]);

  useEffect(() => {
    setLoading(true);
    const run = async () => {
      try {
        if (view === "today") await loadToday();
        else if (view === "tasks") await loadTasks();
        else if (view === "inbox") await loadInbox();
        else if (view === "workspaces") await loadWorkspaces();
        else if (view === "contacts") {
          await loadContacts();
          if (selectedContactId) {
            setContactDetail(await getLifeContactLinked(selectedContactId));
          } else setContactDetail(null);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error";
        if (isSessionExpired(msg)) onSessionLost();
        else onError(msg);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [view, loadToday, loadTasks, loadInbox, loadWorkspaces, loadContacts, selectedContactId, onSessionLost, onError]);

  async function handleComplete(task: LifeTaskSummary) {
    try {
      await completeLifeTask(task.workspaceId, task.id);
      if (view === "today") await loadToday();
      else if (view === "tasks") await loadTasks();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      if (isSessionExpired(msg)) onSessionLost();
      else onError(msg);
    }
  }

  function handleOpenTask(task: LifeTaskSummary) {
    setPendingTaskId(task.id);
    setOpenWorkspaceId(task.workspaceId);
    setWorkspaceTab("tasks");
    setView("workspaces");
  }

  function reportError(err: unknown, fallback: string) {
    const msg = err instanceof Error ? err.message : fallback;
    if (isSessionExpired(msg)) onSessionLost();
    else onError(msg);
  }

  // TODO(backend): idealmente una "tarea personal" sin espacio obligatorio.
  // Mientras tanto resolvemos un espacio «Personal» (o el primero) y su 1ª columna.
  async function ensurePersonalTarget(): Promise<{ wsId: number; colId: number } | null> {
    let ws = workspaces;
    if (ws.length === 0) {
      ws = await listLifeWorkspaces();
      setWorkspaces(ws);
    }
    const personal = ws.find((w) => /personal/i.test(w.name)) ?? ws[0];
    if (!personal) {
      onError("Crea un espacio (idealmente «Personal») para capturar tareas rápidas.");
      return null;
    }
    const board = await listSpaceworkBoard(personal.id);
    const col = board.columns[0];
    if (!col) {
      onError(`El espacio «${personal.name}» no tiene columnas. Ábrelo en Espacios.`);
      return null;
    }
    return { wsId: personal.id, colId: col.id };
  }

  async function reloadTasksAndToday() {
    await loadToday();
    await loadTasks();
  }

  async function handleQuickAdd(title: string, dueAt: Date | null, tags: string[]) {
    setQuickBusy(true);
    try {
      const target = await ensurePersonalTarget();
      if (!target) return;
      await createSpaceworkBoardTask(
        target.wsId,
        target.colId,
        title,
        undefined,
        undefined,
        dueAt ? dueAt.toISOString() : null,
        tags.length ? tags : undefined,
      );
      await reloadTasksAndToday();
    } catch (err) {
      reportError(err, "No se pudo crear la tarea");
    } finally {
      setQuickBusy(false);
    }
  }

  function presetDate(when: RescheduleWhen): Date {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    if (when === "tomorrow") d.setDate(d.getDate() + 1);
    else if (when === "+3") d.setDate(d.getDate() + 3);
    return d;
  }

  async function applyDue(task: LifeTaskSummary, dueAt: Date) {
    try {
      await updateSpaceworkBoardTask(task.workspaceId, task.id, { dueAt: dueAt.toISOString() });
      await reloadTasksAndToday();
    } catch (err) {
      reportError(err, "No se pudo reprogramar");
    }
  }

  function handleReschedule(task: LifeTaskSummary, when: RescheduleWhen) {
    const d = presetDate(when);
    const prev = task.dueAt ? new Date(task.dueAt) : null;
    if (prev && (prev.getHours() || prev.getMinutes())) d.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
    void applyDue(task, d);
  }

  function handleSnooze(task: LifeTaskSummary, days: number) {
    const base = task.dueAt ? new Date(task.dueAt) : new Date();
    if (!task.dueAt) base.setHours(9, 0, 0, 0);
    base.setDate(base.getDate() + days);
    void applyDue(task, base);
  }

  async function handleRename(task: LifeTaskSummary, title: string) {
    try {
      await updateSpaceworkBoardTask(task.workspaceId, task.id, { title });
      await reloadTasksAndToday();
    } catch (err) {
      reportError(err, "No se pudo renombrar");
    }
  }

  async function handlePromoteInbox(item: LifeInboxItem, when: RescheduleWhen | null) {
    setInboxActing(true);
    try {
      const target = await ensurePersonalTarget();
      if (!target) return;
      const title = (item.content.split("\n")[0] || item.content).trim().slice(0, 200);
      const dueAt = when ? presetDate(when) : null;
      await patchLifeInbox(item.id, {
        convertToTaskTitle: title,
        workspaceId: target.wsId,
        convertToTaskDueAt: dueAt ? dueAt.toISOString() : undefined,
      });
      await loadToday();
      await loadInbox();
      onInboxChange?.();
    } catch (err) {
      reportError(err, "No se pudo agendar");
    } finally {
      setInboxActing(false);
    }
  }

  function selectCockpitFilter(f: CockpitFilter) {
    setCockpitFilter(f);
    if (f !== "foco") {
      setTaskFilter(f);
      void listLifeTasks(f, tagFilter || undefined).then(setTasks).catch((err) => reportError(err, "Error"));
    }
  }

  // Atajo global: «c» enfoca la captura rápida (cuando no escribes en un campo).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      const typing =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "c" && view === "today") {
        e.preventDefault();
        quickRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  function openCreateTask() {
    setNewTaskTitle("");
    setNewTaskDueAt("");
    setNewTaskWorkspaceId(workspaces[0]?.id ?? "");
    setCreateTaskOpen(true);
    if (workspaces.length === 0) void loadWorkspaces();
  }

  async function handleCreateTask(e: FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim() || newTaskWorkspaceId === "") return;
    setCreatingTask(true);
    try {
      const board = await listSpaceworkBoard(newTaskWorkspaceId);
      const column = board.columns[0];
      if (!column) {
        onError("El espacio no tiene columnas. Ábrelo en Espacios primero.");
        return;
      }
      await createSpaceworkBoardTask(
        newTaskWorkspaceId,
        column.id,
        newTaskTitle.trim(),
        undefined,
        undefined,
        newTaskDueAt ? new Date(newTaskDueAt).toISOString() : null,
      );
      setCreateTaskOpen(false);
      if (view === "tasks") await loadTasks();
      else if (view === "today") await loadToday();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo crear la tarea");
    } finally {
      setCreatingTask(false);
    }
  }

  async function handleCreateWorkspace(e: FormEvent) {
    e.preventDefault();
    if (!newWsName.trim()) return;
    try {
      const ws = await createLifeWorkspace(newWsName.trim(), undefined, newWsTemplate);
      setCreateWsOpen(false);
      setNewWsName("");
      await loadWorkspaces();
      setOpenWorkspaceId(ws.id);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error");
    }
  }

  async function handleCreateContact(e: FormEvent) {
    e.preventDefault();
    if (!newContactName.trim()) return;
    try {
      await createLifeContact(newContactName.trim());
      setCreateContactOpen(false);
      setNewContactName("");
      await loadContacts();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error");
    }
  }

  async function handleProcessInbox(item: LifeInboxItem, discard: boolean) {
    try {
      if (discard) await deleteLifeInbox(item.id);
      else await patchLifeInbox(item.id, { processed: true });
      await loadInbox();
      onInboxChange?.();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error");
    }
  }

  function openConvert(item: LifeInboxItem) {
    const firstLine = item.content.split("\n")[0]?.trim() || item.content.trim();
    setConvertTitle(firstLine.slice(0, 200));
    setConvertWorkspaceId(workspaces[0]?.id ?? "");
    setConvertDueAt("");
    setConvertItem(item);
    if (workspaces.length === 0) void loadWorkspaces();
  }

  async function handleConvertInbox(e: FormEvent) {
    e.preventDefault();
    if (!convertItem || !convertTitle.trim() || convertWorkspaceId === "") return;
    setInboxActing(true);
    try {
      await patchLifeInbox(convertItem.id, {
        convertToTaskTitle: convertTitle.trim(),
        workspaceId: convertWorkspaceId,
        convertToTaskDueAt: convertDueAt ? new Date(convertDueAt).toISOString() : undefined,
      });
      setConvertItem(null);
      await loadInbox();
      onInboxChange?.();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error");
    } finally {
      setInboxActing(false);
    }
  }

  async function handleMoveInbox(e: FormEvent) {
    e.preventDefault();
    if (!moveItem || moveWorkspaceId === "") return;
    setInboxActing(true);
    try {
      await patchLifeInbox(moveItem.id, { processed: true, workspaceId: moveWorkspaceId });
      setMoveItem(null);
      await loadInbox();
      onInboxChange?.();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error");
    } finally {
      setInboxActing(false);
    }
  }

  const inboxBadge = today?.inboxPendingCount ?? 0;
  const displayTimezone = today?.meta?.timezone ?? appTimezone ?? DEFAULT_APP_TIMEZONE;
  const overdueCount = today?.tasksOverdue.length ?? 0;
  const hasOverdue = overdueCount > 0;
  const tasksDueTodaySorted = today
    ? sortTasksForTodayWidget(today.tasksDueToday, displayTimezone)
    : [];
  const openWorkspace = workspaces.find((w) => w.id === openWorkspaceId);
  const taskRowProps = {
    onComplete: handleComplete,
    onOpen: handleOpenTask,
    onReschedule: handleReschedule,
    onSnooze: handleSnooze,
    onRename: handleRename,
  };

  return (
    <div className="life-panel">
      <WorkspaceChrome
        title="Vida"
        subtitle={`Hola, ${sessionUsername} · tu espacio personal`}
        toolbar={null}
      />

      <nav className="life-subnav" aria-label="Vida">
        {SUBNAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className={["life-subnav__btn", view === item.id && "on"].filter(Boolean).join(" ")}
            onClick={() => {
              setView(item.id);
              setOpenWorkspaceId(null);
              setSelectedContactId(null);
            }}
          >
            {item.label}
            {item.id === "inbox" && inboxBadge > 0 && (
              <span className="life-subnav__badge">{inboxBadge > 99 ? "99+" : inboxBadge}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="life-body">
        {loading && <p className="life-empty">Cargando…</p>}

        {!loading && view === "today" && today && (
          <>
            <QuickAddBar onAdd={handleQuickAdd} busy={quickBusy} />

            <div
              className={[
                "life-today-hero",
                hasOverdue && "life-today-hero--has-overdue",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div
                className={[
                  "life-today-hero__stat",
                  "life-today-hero__stat--overdue",
                  hasOverdue ? "life-today-hero__stat--priority" : "life-today-hero__stat--quiet",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={
                  hasOverdue
                    ? `${overdueCount} ${overdueCount === 1 ? "tarea vencida" : "tareas vencidas"}`
                    : "Nada vencido"
                }
              >
                {hasOverdue ? (
                  <span className="life-today-hero__value">{overdueCount}</span>
                ) : (
                  <span className="life-today-hero__value life-today-hero__value--text">
                    Nada vencido
                  </span>
                )}
                <span className="life-today-hero__label">Vencidas</span>
              </div>
              <div
                className={[
                  "life-today-hero__stat",
                  "life-today-hero__stat--today",
                  today.tasksDueToday.length > 0 && "life-today-hero__stat--focus",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="life-today-hero__value">{today.tasksDueToday.length}</span>
                <span className="life-today-hero__label">Para hoy</span>
              </div>
              <div className="life-today-hero__stat">
                <span className="life-today-hero__value">{today.tasksDueSoon.length}</span>
                <span className="life-today-hero__label">Próx. 3 días</span>
              </div>
              <div className="life-today-hero__stat">
                <span className="life-today-hero__value">{inboxBadge}</span>
                <span className="life-today-hero__label">Capturas</span>
              </div>
            </div>

            <div className="life-cockpit-toolbar">
              <div className="life-task-filter-group">
                {COCKPIT_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={["life-task-filter-chip", cockpitFilter === f.id && "on"]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => selectCockpitFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="life-task-toolbar__tag">
                <LifeTagInput
                  value={tagFilter}
                  onChange={(v) => {
                    setTagFilter(v);
                    if (cockpitFilter !== "foco") {
                      void listLifeTasks(taskFilter, v || undefined)
                        .then(setTasks)
                        .catch((err) => reportError(err, "Error"));
                    }
                  }}
                  placeholder="Filtrar por etiqueta"
                  className="workspace-search"
                />
              </div>
            </div>

            {cockpitFilter === "foco" ? (
              <>
                {today.inboxPending.length > 0 && (
                  <div className="life-capture-strip">
                    <span className="ds-eyebrow">Captura sin procesar · {inboxBadge}</span>
                    {today.inboxPending.slice(0, 3).map((i) => (
                      <div key={i.id} className="life-capture-strip__item">
                        <span className="life-capture-strip__text">
                          {i.content.split("\n")[0] || i.content}
                        </span>
                        <span className="life-capture-strip__actions">
                          <button
                            type="button"
                            className="btn ghost sm"
                            disabled={inboxActing}
                            onClick={() => void handlePromoteInbox(i, "today")}
                          >
                            → Hoy
                          </button>
                          <button
                            type="button"
                            className="btn ghost sm"
                            disabled={inboxActing}
                            onClick={() => void handlePromoteInbox(i, "tomorrow")}
                          >
                            Mañana
                          </button>
                          <button type="button" className="btn ghost sm" onClick={() => openConvert(i)}>
                            Editar…
                          </button>
                        </span>
                      </div>
                    ))}
                    <button type="button" className="life-widget-cta" onClick={() => setView("inbox")}>
                      Ver toda la bandeja →
                    </button>
                  </div>
                )}

                {hasOverdue && (
                  <section className="life-cockpit-section">
                    <p className="life-widget-group-label">Vencidas · {overdueCount}</p>
                    <div className="life-task-list">
                      {today.tasksOverdue.map((t) => (
                        <TaskRow key={t.id} task={t} {...taskRowProps} todaySection="overdue" timezone={displayTimezone} />
                      ))}
                    </div>
                  </section>
                )}

                <section className="life-cockpit-section">
                  <p className="life-widget-group-label">Hoy · {tasksDueTodaySorted.length}</p>
                  {tasksDueTodaySorted.length === 0 ? (
                    <p className="life-empty life-empty--card">
                      Nada para hoy. Escribe arriba para añadir algo · <kbd>c</kbd> para enfocar.
                    </p>
                  ) : (
                    <div className="life-task-list">
                      {tasksDueTodaySorted.map((t) => (
                        <TaskRow key={t.id} task={t} {...taskRowProps} todaySection="today" timezone={displayTimezone} />
                      ))}
                    </div>
                  )}
                </section>

                <section className="life-cockpit-section">
                  <p className="life-widget-group-label">Próximos 3 días · {today.tasksDueSoon.length}</p>
                  {today.tasksDueSoon.length === 0 ? (
                    <p className="life-empty">Nada en los próximos 3 días</p>
                  ) : (
                    <div className="life-task-list">
                      {today.tasksDueSoon.map((t) => (
                        <TaskRow key={t.id} task={t} {...taskRowProps} todaySection="soon" timezone={displayTimezone} />
                      ))}
                    </div>
                  )}
                </section>
              </>
            ) : (
              <section className="life-cockpit-section">
                {tasks.length === 0 ? (
                  <p className="life-empty life-empty--card">Sin tareas en este filtro.</p>
                ) : (
                  <div className="life-task-list">
                    {tasks.map((t) => (
                      <TaskRow key={t.id} task={t} {...taskRowProps} timezone={displayTimezone} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {!loading && view === "tasks" && (
          <>
            <div className="life-section-head">
              <div className="life-section-head__titles">
                <h2 className="life-section-head__title">Tareas</h2>
                <p className="life-section-head__hint">
                  Compromisos con fecha: reuniones, entregas, avisos de WhatsApp convertidos en tareas.
                  Pulsa una fila para editarla.
                </p>
              </div>
              <button type="button" className="btn primary btn-compact" onClick={openCreateTask}>
                + Nueva tarea
              </button>
            </div>
            <div className="life-task-toolbar">
              <div className="life-task-filter-group">
                {(["all", "today", "overdue", "upcoming"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={["life-task-filter-chip", taskFilter === f && "on"].filter(Boolean).join(" ")}
                    onClick={() => setTaskFilter(f)}
                  >
                    {f === "all"
                      ? "Todas"
                      : f === "today"
                        ? "Hoy"
                        : f === "overdue"
                          ? "Vencidas"
                          : "Próximos 7 días"}
                  </button>
                ))}
              </div>
              <div className="life-task-toolbar__tag">
                <LifeTagInput
                  value={tagFilter}
                  onChange={setTagFilter}
                  placeholder="Filtrar por etiqueta"
                  className="workspace-search"
                />
              </div>
            </div>
            {tasks.length === 0 ? (
              <p className="life-empty life-empty--card">
                Sin tareas abiertas. Captura un mensaje de WhatsApp en Captura o crea una tarea nueva.
              </p>
            ) : (
              <div className="life-task-list">
                {tasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    {...taskRowProps}
                    timezone={appTimezone ?? DEFAULT_APP_TIMEZONE}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {!loading && view === "inbox" && (
          <>
            <div className="life-section-head">
              <div className="life-section-head__titles">
                <h2 className="life-section-head__title">Captura</h2>
                <p className="life-section-head__hint">
                  Pega mensajes de WhatsApp (reuniones, fechas, avisos) con ⌘⇧N y conviértelos en tareas con
                  fecha y hora.
                </p>
              </div>
            </div>
            {inbox.length === 0 ? (
              <p className="life-empty life-empty--card">
                Nada en la bandeja. Usa ⌘⇧N o el botón + del sidebar para pegar un mensaje.
              </p>
            ) : (
              <div className="life-inbox-list">
                {inbox.map((item) => (
                  <article
                    key={item.id}
                    className={["life-inbox-card", highlightInboxId === item.id && "life-inbox-card--highlight"]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <p className="life-inbox-card__content">{item.content}</p>
                    <div className="life-inbox-card__meta">
                      <span className="life-inbox-card__kind">{item.kind}</span>
                      <span>{formatDateCompact(item.createdAt)}</span>
                    </div>
                    <div className="life-inbox-card__actions">
                      <button type="button" className="btn btn-compact primary" onClick={() => openConvert(item)}>
                        Agendar como tarea
                      </button>
                      <button
                        type="button"
                        className="btn btn-compact"
                        onClick={() => {
                          setMoveWorkspaceId(workspaces[0]?.id ?? "");
                          setMoveItem(item);
                          if (workspaces.length === 0) void loadWorkspaces();
                        }}
                      >
                        Mover a espacio
                      </button>
                      <button type="button" className="btn btn-compact" onClick={() => void handleProcessInbox(item, false)}>
                        Archivar
                      </button>
                      <button type="button" className="btn btn-compact ghost" onClick={() => void handleProcessInbox(item, true)}>
                        Descartar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {!loading && view === "workspaces" && !openWorkspaceId && (
          <>
            <div style={{ marginBottom: "0.75rem" }}>
              <button type="button" className="btn primary btn-compact" onClick={() => setCreateWsOpen(true)}>
                + Nuevo espacio
              </button>
            </div>
            <div className="life-workspace-grid">
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className="life-workspace-card"
                  onClick={() => setOpenWorkspaceId(w.id)}
                >
                  <strong>{w.name}</strong>
                  <p className="life-task-row__meta">
                    {w.template || "FREE"} · {w.itemCount} items
                  </p>
                </button>
              ))}
            </div>
            {createWsOpen && (
              <form className="life-widget" style={{ marginTop: "1rem" }} onSubmit={(e) => void handleCreateWorkspace(e)}>
                <input
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="Nombre del espacio"
                  required
                  style={{ width: "100%", marginBottom: "0.5rem" }}
                />
                <select value={newWsTemplate} onChange={(e) => setNewWsTemplate(e.target.value)}>
                  <option value="ACADEMIC_COURSE">Curso académico</option>
                  <option value="JOURNAL">Diario</option>
                  <option value="FREE">Libre</option>
                </select>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.65rem" }}>
                  <button type="submit" className="btn primary btn-compact">
                    Crear
                  </button>
                  <button type="button" className="btn ghost btn-compact" onClick={() => setCreateWsOpen(false)}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {!loading && view === "workspaces" && openWorkspaceId && openWorkspace && (
          <div className="life-workspace-detail">
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
              <button type="button" className="btn ghost btn-compact" onClick={() => setOpenWorkspaceId(null)}>
                ← Espacios
              </button>
              <strong>{openWorkspace.name}</strong>
              <button
                type="button"
                className={["btn btn-compact", workspaceTab === "tasks" && "primary"].filter(Boolean).join(" ")}
                onClick={() => setWorkspaceTab("tasks")}
              >
                Tareas
              </button>
              <button
                type="button"
                className={["btn btn-compact", workspaceTab === "wiki" && "primary"].filter(Boolean).join(" ")}
                onClick={() => setWorkspaceTab("wiki")}
              >
                Wiki
              </button>
              <button
                type="button"
                className="btn btn-compact ghost"
                disabled={promoting}
                onClick={() => {
                  if (
                    !confirm(
                      "¿Convertir este espacio a Spacework de equipo? Podrás invitar miembros desde Spacework.",
                    )
                  ) {
                    return;
                  }
                  setPromoting(true);
                  void promoteLifeWorkspace(openWorkspaceId)
                    .then(() => {
                      setOpenWorkspaceId(null);
                      void loadWorkspaces();
                    })
                    .catch((err) => onError(err instanceof Error ? err.message : "No se pudo convertir"))
                    .finally(() => setPromoting(false));
                }}
              >
                {promoting ? "Convirtiendo…" : "Compartir como equipo"}
              </button>
              <button
                type="button"
                className="btn btn-compact ghost"
                onClick={() => {
                  if (confirm("¿Archivar este espacio?")) {
                    void archiveLifeWorkspace(openWorkspaceId).then(() => {
                      setOpenWorkspaceId(null);
                      void loadWorkspaces();
                    });
                  }
                }}
              >
                Archivar
              </button>
            </div>
            {workspaceTab === "tasks" ? (
              <SpaceworkKanbanPanel
                projectId={openWorkspaceId}
                myRole={"OWNER" as ProjectRole}
                members={wsMembers}
                projectFiles={wsFiles}
                lifeFeatures
                initialTaskId={pendingTaskId}
                onInitialTaskConsumed={() => setPendingTaskId(null)}
                onSessionLost={onSessionLost}
                onError={onError}
              />
            ) : (
              <SpaceworkWikiPanel
                projectId={openWorkspaceId}
                myRole={"OWNER" as ProjectRole}
                initialSlug={null}
                onSessionLost={onSessionLost}
                onError={onError}
              />
            )}
          </div>
        )}

        {!loading && view === "contacts" && !selectedContactId && (
          <>
            <button type="button" className="btn primary btn-compact" style={{ marginBottom: "0.75rem" }} onClick={() => setCreateContactOpen(true)}>
              + Contacto
            </button>
            <ul className="life-contact-list">
              {contacts.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setSelectedContactId(c.id)}>
                    <strong>{c.name}</strong>
                    {c.roleLabel && <span className="life-task-row__meta"> · {c.roleLabel}</span>}
                  </button>
                </li>
              ))}
            </ul>
            {createContactOpen && (
              <form className="life-widget" style={{ marginTop: "1rem" }} onSubmit={(e) => void handleCreateContact(e)}>
                <input
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Nombre"
                  required
                  style={{ width: "100%" }}
                />
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.65rem" }}>
                  <button type="submit" className="btn primary btn-compact">
                    Guardar
                  </button>
                  <button type="button" className="btn ghost btn-compact" onClick={() => setCreateContactOpen(false)}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {!loading && view === "contacts" && selectedContactId && contactDetail && (
          <>
            <button type="button" className="btn ghost btn-compact" onClick={() => setSelectedContactId(null)}>
              ← Personas
            </button>
            <div className="life-widget" style={{ marginTop: "0.75rem" }}>
              <h2 style={{ margin: "0 0 0.35rem", fontSize: "1.1rem" }}>{contactDetail.contact.name}</h2>
              {contactDetail.contact.roleLabel && (
                <p className="life-task-row__meta">{contactDetail.contact.roleLabel}</p>
              )}
              {contactDetail.contact.email && (
                <p className="life-task-row__meta">{contactDetail.contact.email}</p>
              )}
              {contactDetail.contact.notes && <p style={{ marginTop: "0.5rem" }}>{contactDetail.contact.notes}</p>}
              <button
                type="button"
                className="btn ghost btn-compact"
                style={{ marginTop: "0.65rem" }}
                onClick={() => {
                  if (confirm("¿Eliminar contacto?")) {
                    void deleteLifeContact(selectedContactId).then(() => {
                      setSelectedContactId(null);
                      void loadContacts();
                    });
                  }
                }}
              >
                Eliminar
              </button>
            </div>
            <section className="life-widget" style={{ marginTop: "0.75rem" }}>
              <h3>Tareas vinculadas</h3>
              {contactDetail.tasks.length === 0 ? (
                <p className="life-empty">Sin tareas</p>
              ) : (
                contactDetail.tasks.map((t) => (
                  <TaskRow key={t.id} task={t} {...taskRowProps} />
                ))
              )}
            </section>
            <section className="life-widget" style={{ marginTop: "0.75rem" }}>
              <h3>Archivos vinculados</h3>
              {contactDetail.files.length === 0 ? (
                <p className="life-empty">Sin archivos</p>
              ) : (
                contactDetail.files.map((f) => (
                  <p key={f.id} className="life-task-row__meta" style={{ margin: "0.35rem 0" }}>
                    {f.name}
                  </p>
                ))
              )}
            </section>
          </>
        )}
      </div>

      {convertItem && (
        <div className="confirm-backdrop" role="presentation" onClick={() => setConvertItem(null)}>
          <form
            className="confirm-card spacework-modal life-convert-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void handleConvertInbox(e)}
          >
            <h2>Agendar compromiso</h2>
            <p className="muted" style={{ marginTop: 0, fontSize: "0.78rem" }}>
              Pon fecha y hora para no olvidar reuniones o avisos.
            </p>
            <p className="life-convert-modal__source">{convertItem.content}</p>
            <label className="spacework-kanban-detail__field">
              <span>Título</span>
              <input value={convertTitle} onChange={(e) => setConvertTitle(e.target.value)} required />
            </label>
            <label className="spacework-kanban-detail__field">
              <span>Espacio</span>
              <select
                value={convertWorkspaceId}
                onChange={(e) => setConvertWorkspaceId(e.target.value ? Number(e.target.value) : "")}
                required
              >
                <option value="">Selecciona…</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="spacework-kanban-detail__field">
              <span>Cuándo (recomendado para reuniones)</span>
              <input
                type="datetime-local"
                value={convertDueAt}
                onChange={(e) => setConvertDueAt(e.target.value)}
              />
            </label>
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={() => setConvertItem(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn primary" disabled={inboxActing || convertWorkspaceId === ""}>
                {inboxActing ? "…" : "Crear tarea"}
              </button>
            </div>
          </form>
        </div>
      )}

      {createTaskOpen && (
        <div className="confirm-backdrop" role="presentation" onClick={() => setCreateTaskOpen(false)}>
          <form
            className="confirm-card spacework-modal life-convert-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void handleCreateTask(e)}
          >
            <h2>Nueva tarea</h2>
            <label className="spacework-kanban-detail__field">
              <span>Título</span>
              <input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Ej. Reunión con el grupo de álgebra"
                required
              />
            </label>
            <label className="spacework-kanban-detail__field">
              <span>Espacio</span>
              <select
                value={newTaskWorkspaceId}
                onChange={(e) => setNewTaskWorkspaceId(e.target.value ? Number(e.target.value) : "")}
                required
              >
                <option value="">Selecciona…</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="spacework-kanban-detail__field">
              <span>Cuándo</span>
              <input
                type="datetime-local"
                value={newTaskDueAt}
                onChange={(e) => setNewTaskDueAt(e.target.value)}
              />
            </label>
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={() => setCreateTaskOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn primary" disabled={creatingTask || newTaskWorkspaceId === ""}>
                {creatingTask ? "…" : "Crear"}
              </button>
            </div>
          </form>
        </div>
      )}

      {moveItem && (
        <div className="confirm-backdrop" role="presentation" onClick={() => setMoveItem(null)}>
          <form
            className="confirm-card spacework-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void handleMoveInbox(e)}
          >
            <h2>Mover a espacio</h2>
            <label className="spacework-kanban-detail__field">
              <span>Espacio</span>
              <select
                value={moveWorkspaceId}
                onChange={(e) => setMoveWorkspaceId(e.target.value ? Number(e.target.value) : "")}
                required
              >
                <option value="">Selecciona…</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={() => setMoveItem(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn primary" disabled={inboxActing || moveWorkspaceId === ""}>
                {inboxActing ? "…" : "Mover"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
