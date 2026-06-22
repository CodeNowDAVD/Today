import type { FileItem, SpaceworkItem } from "./api";

/** Convierte un ítem de proyecto a FileItem mínimo para vista previa/descarga. */
export function spaceworkItemToFile(item: SpaceworkItem): FileItem | null {
  if (item.kind !== "FILE" || item.fileId == null || !item.fileName) return null;
  return {
    id: item.fileId,
    originalName: item.fileName,
    contentType: item.fileContentType ?? "application/octet-stream",
    sizeBytes: item.fileSizeBytes ?? 0,
    section: "UTILS",
    createdAt: item.addedAt,
    ownerUsername: item.fileOwnerUsername ?? "?",
    deletedAt: null,
    daysUntilPermanentDelete: null,
    folderId: null,
  };
}
