import type { FolderFilter } from "./ProjectsNav";

/** Archivos/enlaces sin carpeta de proyecto (folderId nulo). */
export const LOOSE_FOLDER_LABEL = "Sueltos";

export function normalizeSearchText(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function folderInitial(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  return t[0].toUpperCase();
}

/** ¿El archivo pertenece a la vista de carpeta actual? */
export function fileMatchesFolderFilter(
  file: { folderId: number | null | undefined },
  filter: FolderFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "none") return file.folderId == null;
  return file.folderId === filter;
}
