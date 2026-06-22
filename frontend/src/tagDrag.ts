import type { DragEvent } from "react";

export const TAG_DRAG_MIME = "application/x-sorbits-tag-id";

export function readDraggedTagId(dataTransfer: DataTransfer): number | null {
  const raw = dataTransfer.getData(TAG_DRAG_MIME);
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

export function writeDraggedTagId(dataTransfer: DataTransfer, tagId: number) {
  dataTransfer.setData(TAG_DRAG_MIME, String(tagId));
  dataTransfer.effectAllowed = "copy";
}

export function isTagDrag(dataTransfer: DataTransfer): boolean {
  return dataTransfer.types.includes(TAG_DRAG_MIME);
}

type TagDropHandlers = {
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent) => void;
};

export function createTagDropHandlers(
  itemId: number,
  enabled: boolean,
  setDropTargetId: (id: number | null | ((prev: number | null) => number | null)) => void,
  onPin: (itemId: number, tagId: number) => void,
): TagDropHandlers | Record<string, never> {
  if (!enabled) return {};
  return {
    onDragOver: (e: DragEvent) => {
      if (!isTagDrag(e.dataTransfer)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDropTargetId(itemId);
    },
    onDragLeave: () => {
      setDropTargetId((prev) => (prev === itemId ? null : prev));
    },
    onDrop: (e: DragEvent) => {
      if (!isTagDrag(e.dataTransfer)) return;
      e.preventDefault();
      setDropTargetId(null);
      const tagId = readDraggedTagId(e.dataTransfer);
      if (tagId != null) onPin(itemId, tagId);
    },
  };
}
