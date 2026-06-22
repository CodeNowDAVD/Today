import type { PresentationSession, PresentationSessionItem } from "./types";

const STORAGE_KEY = "sorbits.presentationSessions";

function readAll(): PresentationSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidSession);
  } catch {
    return [];
  }
}

function writeAll(sessions: PresentationSession[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function isValidSession(value: unknown): value is PresentationSession {
  if (!value || typeof value !== "object") return false;
  const s = value as PresentationSession;
  return (
    typeof s.id === "string" &&
    typeof s.title === "string" &&
    Array.isArray(s.items) &&
    typeof s.createdAt === "string" &&
    typeof s.updatedAt === "string"
  );
}

export function loadPresentationSessions(): PresentationSession[] {
  return readAll();
}

/** Sesiones ordenadas por fecha de actualización (más reciente primero). */
export function listSessions(): PresentationSession[] {
  return readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function loadPresentationSession(id: string): PresentationSession | null {
  return readAll().find((s) => s.id === id) ?? null;
}

export function upsertPresentationSession(session: PresentationSession): void {
  const all = readAll();
  const index = all.findIndex((s) => s.id === session.id);
  if (index >= 0) {
    all[index] = session;
  } else {
    all.push(session);
  }
  writeAll(all);
}

export function deletePresentationSession(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id));
}

export function renameSessionTitle(id: string, title: string): PresentationSession | null {
  const trimmed = title.trim();
  if (!trimmed) return null;
  const all = readAll();
  const index = all.findIndex((s) => s.id === id);
  if (index < 0) return null;
  const updated = touchSession({ ...all[index], title: trimmed });
  all[index] = updated;
  writeAll(all);
  return updated;
}

export function duplicateSession(id: string): PresentationSession | null {
  const all = readAll();
  const source = all.find((s) => s.id === id);
  if (!source) return null;
  const now = new Date().toISOString();
  const copy: PresentationSession = {
    ...source,
    id: crypto.randomUUID(),
    title: `Copia de ${source.title}`,
    items: source.items.map((item) => ({ ...item })),
    createdAt: now,
    updatedAt: now,
  };
  writeAll([...all, copy]);
  return copy;
}

export function createPresentationSession(
  fileIds: number[],
  title = "Presentación técnica",
  subtitle?: string,
): PresentationSession {
  const now = new Date().toISOString();
  const items: PresentationSessionItem[] = fileIds.map((fileId, order) => ({
    fileId,
    order,
  }));
  return {
    id: crypto.randomUUID(),
    title,
    subtitle,
    items,
    createdAt: now,
    updatedAt: now,
  };
}

export function touchSession(session: PresentationSession): PresentationSession {
  return { ...session, updatedAt: new Date().toISOString() };
}

export function normalizeItemOrders(items: PresentationSessionItem[]): PresentationSessionItem[] {
  return [...items]
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));
}
