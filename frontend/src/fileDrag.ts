import type { DragEvent } from "react";

export const FILE_DRAG_MIME = "application/x-sorbits-file-id";

/** IDs del arrastre en curso (getData solo funciona en drop). */
let activeDraggedFileIds: number[] = [];

export function readDraggedFileIds(dataTransfer: DataTransfer): number[] {
  const raw = dataTransfer.getData(FILE_DRAG_MIME);
  if (raw) {
    if (raw.startsWith("[")) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map(Number).filter((id) => Number.isFinite(id));
        }
      } catch {
        /* fallback abajo */
      }
    }
    const id = Number(raw);
    if (Number.isFinite(id)) return [id];
  }
  return [...activeDraggedFileIds];
}

export function readDraggedFileId(dataTransfer: DataTransfer): number | null {
  const ids = readDraggedFileIds(dataTransfer);
  return ids[0] ?? null;
}

/** Durante dragenter/dragover: getData está vacío; usar IDs activos del drag. */
export function peekDraggedFileIds(dataTransfer: DataTransfer): number[] {
  if (!isFileDrag(dataTransfer)) return [];
  return [...activeDraggedFileIds];
}

export function peekDraggedFileId(dataTransfer: DataTransfer): number | null {
  const ids = peekDraggedFileIds(dataTransfer);
  return ids[0] ?? null;
}

export function writeDraggedFileIds(dataTransfer: DataTransfer, fileIds: number[]) {
  const unique = [...new Set(fileIds.filter((id) => Number.isFinite(id)))];
  if (unique.length === 0) return;
  dataTransfer.setData(
    FILE_DRAG_MIME,
    unique.length === 1 ? String(unique[0]) : JSON.stringify(unique),
  );
  dataTransfer.effectAllowed = "move";
  activeDraggedFileIds = unique;
}

export function writeDraggedFileId(dataTransfer: DataTransfer, fileId: number) {
  writeDraggedFileIds(dataTransfer, [fileId]);
}

export function clearDraggedFileId() {
  activeDraggedFileIds = [];
}

export function isFileDrag(dataTransfer: DataTransfer): boolean {
  return dataTransfer.types.includes(FILE_DRAG_MIME);
}

/** Arrastre interno de la app (archivo, enlace o etiqueta). */
export function isInternalAppDrag(dataTransfer: DataTransfer): boolean {
  return (
    isFileDrag(dataTransfer) ||
    dataTransfer.types.includes("application/x-sorbits-link-id") ||
    dataTransfer.types.includes("application/x-sorbits-tag-id")
  );
}

export function hasFileDragItems(dataTransfer: DataTransfer): boolean {
  if (!dataTransfer.items?.length) return false;
  return [...dataTransfer.items].some((item) => item.kind === "file");
}

/** Archivos del sistema (Finder/escritorio), no un elemento ya listado en SOrbitS. */
export function isOsFileDrop(dataTransfer: DataTransfer): boolean {
  if (isInternalAppDrag(dataTransfer)) return false;
  if (hasFileDragItems(dataTransfer)) return true;

  const types = [...dataTransfer.types].map((t) => t.toLowerCase());
  return (
    types.includes("files") ||
    types.includes("public.file-url") ||
    types.includes("application/x-moz-file")
  );
}

/** Permite dragover/drop aunque el navegador aún no exponga types (Safari/Finder). */
export function mayAcceptOsFileDrop(dataTransfer: DataTransfer): boolean {
  if (isInternalAppDrag(dataTransfer)) return false;
  if (isOsFileDrop(dataTransfer)) return true;

  const types = [...dataTransfer.types];
  if (types.length === 0) return true;
  if (types.length === 1 && (types[0] === "text/plain" || types[0] === "text/html")) {
    return false;
  }
  return false;
}

export function filesFromDataTransfer(dataTransfer: DataTransfer): File[] {
  if (dataTransfer.files?.length) {
    return Array.from(dataTransfer.files);
  }
  const picked: File[] = [];
  if (dataTransfer.items) {
    for (const item of dataTransfer.items) {
      if (item.kind !== "file") continue;
      const file = item.getAsFile();
      if (file) picked.push(file);
    }
  }
  return picked;
}

export function toFileList(files: File[]): FileList {
  const dt = new DataTransfer();
  for (const file of files) dt.items.add(file);
  return dt.files;
}
