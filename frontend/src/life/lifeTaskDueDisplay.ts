import type { LifeTaskSummary } from "../api";

export type LifeDueBucket = "OVERDUE" | "TODAY" | "SOON" | "LATER" | "NONE";

/** Sección visual en Hoy — mutuamente excluyente con la etiqueta. */
export type LifeTodaySection = "overdue" | "today" | "soon";

export type LifeDueDisplay = {
  label: string;
  kind: "overdue" | "today" | "soon" | "calm";
};

function parseDueInstant(dueAt: string): Date {
  return new Date(dueAt);
}

function hasExplicitTime(dueAt: string, timezone?: string): boolean {
  const d = parseDueInstant(dueAt);
  if (Number.isNaN(d.getTime())) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(d);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour !== 0 || minute !== 0;
}

function formatDueTime(dueAt: string, timezone?: string): string {
  return parseDueInstant(dueAt).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
}

function formatDueDateShort(dueAt: string, timezone?: string): string {
  return parseDueInstant(dueAt).toLocaleDateString("es-MX", {
    month: "short",
    day: "numeric",
    timeZone: timezone,
  });
}

function formatDueDateWithWeekday(dueAt: string, timezone?: string): string {
  const d = parseDueInstant(dueAt);
  const weekday = d
    .toLocaleDateString("es-MX", { weekday: "short", timeZone: timezone })
    .replace(/\.$/, "");
  const wd = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const date = d.toLocaleDateString("es-MX", {
    month: "short",
    day: "numeric",
    timeZone: timezone,
  });
  return `${wd} ${date}`;
}

/** Para hoy en Hoy: con hora primero (asc), sin hora al final. */
export function sortTasksForTodayWidget(
  tasks: LifeTaskSummary[],
  timezone?: string,
): LifeTaskSummary[] {
  const withTime: LifeTaskSummary[] = [];
  const withoutTime: LifeTaskSummary[] = [];
  for (const t of tasks) {
    if (t.dueAt && hasExplicitTime(t.dueAt, timezone)) withTime.push(t);
    else withoutTime.push(t);
  }
  withTime.sort(
    (a, b) => parseDueInstant(a.dueAt!).getTime() - parseDueInstant(b.dueAt!).getTime(),
  );
  return [...withTime, ...withoutTime];
}

/**
 * Etiqueta de fecha para filas de Hoy.
 * Usa la sección del bloque como fuente de verdad visual (sin “Vencida” en Para hoy).
 */
export function lifeTodayTaskDueDisplay(
  task: LifeTaskSummary,
  section: LifeTodaySection,
  timezone?: string,
): LifeDueDisplay {
  if (!task.dueAt) {
    return { label: "", kind: "calm" };
  }

  if (section === "overdue") {
    return { label: "Vencida", kind: "overdue" };
  }

  if (section === "today") {
    if (hasExplicitTime(task.dueAt, timezone)) {
      return { label: formatDueTime(task.dueAt, timezone), kind: "today" };
    }
    return { label: "Hoy", kind: "today" };
  }

  return { label: formatDueDateWithWeekday(task.dueAt, timezone), kind: "soon" };
}

/** Listado Tareas — respeta dueBucket del servidor cuando existe. */
export function lifeListTaskDueDisplay(
  task: LifeTaskSummary,
  timezone?: string,
): LifeDueDisplay {
  if (!task.dueAt) {
    return { label: "", kind: "calm" };
  }

  const bucket = (task.dueBucket ?? "") as LifeDueBucket;

  if (bucket === "OVERDUE") {
    return { label: "Vencida", kind: "overdue" };
  }
  if (bucket === "TODAY") {
    if (hasExplicitTime(task.dueAt, timezone)) {
      return { label: formatDueTime(task.dueAt, timezone), kind: "today" };
    }
    return { label: "Hoy", kind: "today" };
  }
  if (bucket === "SOON" || bucket === "LATER") {
    return { label: formatDueDateShort(task.dueAt, timezone), kind: "soon" };
  }

  return { label: formatDueDateShort(task.dueAt, timezone), kind: "calm" };
}
