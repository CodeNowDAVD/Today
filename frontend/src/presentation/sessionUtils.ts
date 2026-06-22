import type { FileItem } from "../api";
import { isPdfFile, toPdfFileEntry, type PdfFileEntry } from "../pdf/pdfFiles";
import type { PresentationSession, PresentationSessionItem } from "./types";
import { normalizeItemOrders } from "./storage";

export function sortedSessionItems(session: PresentationSession): PresentationSessionItem[] {
  return normalizeItemOrders(session.items);
}

export function sessionToPdfEntries(
  session: PresentationSession,
  files: FileItem[],
): PdfFileEntry[] {
  return sortedSessionItems(session)
    .map((item) => files.find((f) => f.id === item.fileId))
    .filter((f): f is FileItem => f != null && isPdfFile(f))
    .map(toPdfFileEntry);
}

export function fileNameById(files: FileItem[], fileId: number): string {
  return files.find((f) => f.id === fileId)?.originalName ?? `Archivo #${fileId}`;
}

/** Archivos conocidos referenciados por la sesión, en orden de la sesión. */
export function resolveSessionFiles(
  session: PresentationSession,
  knownFiles: FileItem[],
): FileItem[] {
  const byId = new Map(knownFiles.map((f) => [f.id, f]));
  return sortedSessionItems(session)
    .map((item) => byId.get(item.fileId))
    .filter((f): f is FileItem => f != null);
}
