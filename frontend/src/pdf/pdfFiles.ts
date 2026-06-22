import type { FileItem } from "../api";
import { getFileClipboardMode } from "../filePreview";

export type PdfFileEntry = {
  id: number;
  name: string;
};

export function isPdfFile(
  file: Pick<FileItem, "originalName" | "contentType" | "sizeBytes">,
): boolean {
  return getFileClipboardMode(file) === "pdf";
}

export function toPdfFileEntry(file: FileItem): PdfFileEntry {
  return { id: file.id, name: file.originalName };
}

/** Orden = orden de selección del usuario. */
export function pdfFilesFromSelection(files: FileItem[], selectedIds: number[]): FileItem[] {
  return selectedIds
    .map((id) => files.find((f) => f.id === id))
    .filter((f): f is FileItem => f != null && isPdfFile(f));
}

/** Orden = orden de la tabla (lista visible). */
export function pdfFilesFromList(files: FileItem[]): FileItem[] {
  return files.filter(isPdfFile);
}
