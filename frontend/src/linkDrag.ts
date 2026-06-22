import type { DragEvent } from "react";

export const LINK_DRAG_MIME = "application/x-sorbits-link-id";

export function readDraggedLinkId(dataTransfer: DataTransfer): number | null {
  const raw = dataTransfer.getData(LINK_DRAG_MIME);
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

export function writeDraggedLinkId(dataTransfer: DataTransfer, linkId: number) {
  dataTransfer.setData(LINK_DRAG_MIME, String(linkId));
  dataTransfer.effectAllowed = "move";
}

export function isLinkDrag(dataTransfer: DataTransfer): boolean {
  return dataTransfer.types.includes(LINK_DRAG_MIME);
}
