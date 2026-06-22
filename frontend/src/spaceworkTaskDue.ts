export type DueBadgeKind = "none" | "soon" | "overdue";

export function taskDueBadge(dueAt: string | null, completedAt: string | null): DueBadgeKind {
  if (!dueAt || completedAt) return "none";
  const due = new Date(dueAt).getTime();
  const now = Date.now();
  if (due < now) return "overdue";
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  if (due - now <= threeDays) return "soon";
  return "none";
}

export function formatTaskDueShort(dueAt: string): string {
  return new Date(dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
