import { useEffect, useRef, useState } from "react";
import type { FileItem } from "../api";
import { moveToTrash } from "../api";

type Options = {
  files: FileItem[];
  onReload: () => Promise<void>;
  onCountsReload: () => void;
  onError: (msg: string) => void;
};

export type FileRowSelectModifiers = {
  shiftKey?: boolean;
  metaKey?: boolean;
};

export function useFileSelection({ files, onReload, onCountsReload, onError }: Options) {
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [trashTargets, setTrashTargets] = useState<FileItem[]>([]);
  const selectionAnchorRef = useRef<number | null>(null);

  useEffect(() => {
    setSelectedFileIds((prev) => prev.filter((id) => files.some((f) => f.id === id)));
  }, [files]);

  useEffect(() => {
    if (!selectionMode) {
      setSelectedFileIds([]);
      selectionAnchorRef.current = null;
    }
  }, [selectionMode]);

  const selectedCount = selectedFileIds.length;
  const allSelectedOnPage = selectionMode && files.length > 0 && selectedCount === files.length;

  function setAnchor(fileId: number) {
    selectionAnchorRef.current = fileId;
  }

  function selectFileRow(fileId: number, modifiers: FileRowSelectModifiers = {}) {
    const { shiftKey = false, metaKey = false } = modifiers;

    if (!selectionMode) {
      setSelectionMode(true);
    }

    setSelectedFileIds((prev) => {
      const anchorId = selectionAnchorRef.current;

      if (shiftKey && anchorId != null) {
        const anchorIdx = files.findIndex((f) => f.id === anchorId);
        const clickIdx = files.findIndex((f) => f.id === fileId);
        if (anchorIdx >= 0 && clickIdx >= 0) {
          const start = Math.min(anchorIdx, clickIdx);
          const end = Math.max(anchorIdx, clickIdx);
          const rangeIds = files.slice(start, end + 1).map((f) => f.id);
          if (metaKey) {
            return [...new Set([...prev, ...rangeIds])];
          }
          return rangeIds;
        }
      }

      if (metaKey) {
        if (prev.includes(fileId)) {
          return prev.filter((id) => id !== fileId);
        }
        return [...prev, fileId];
      }

      return [fileId];
    });

    if (!shiftKey) {
      selectionAnchorRef.current = fileId;
    }
  }

  function toggleRowSelection(fileId: number, checked: boolean, modifiers?: FileRowSelectModifiers) {
    if (modifiers?.shiftKey) {
      selectFileRow(fileId, modifiers);
      return;
    }

    if (!selectionMode) {
      setSelectionMode(true);
    }

    setSelectedFileIds((prev) => {
      if (checked) {
        selectionAnchorRef.current = fileId;
        return prev.includes(fileId) ? prev : [...prev, fileId];
      }
      return prev.filter((id) => id !== fileId);
    });
  }

  function toggleSelectAll(checked: boolean) {
    const ids = checked ? files.map((f) => f.id) : [];
    setSelectedFileIds(ids);
    if (checked && files.length > 0) {
      selectionAnchorRef.current = files[0].id;
    }
  }

  function clearSelection() {
    setSelectedFileIds([]);
    selectionAnchorRef.current = null;
  }

  function requestTrash(f: FileItem) {
    setTrashTargets([f]);
  }

  function requestBulkTrash() {
    if (selectedFileIds.length === 0) return;
    const targets = files.filter((f) => selectedFileIds.includes(f.id));
    if (targets.length === 0) return;
    setTrashTargets(targets);
  }

  async function confirmTrash() {
    if (trashTargets.length === 0) return;
    const targets = trashTargets;
    setTrashTargets([]);
    try {
      const results = await Promise.allSettled(targets.map((f) => moveToTrash(f.id)));
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        onError(`Se movieron ${targets.length - failed}. ${failed} no se pudieron mover.`);
      }
      onCountsReload();
      clearSelection();
      await onReload();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo mover a eliminados");
    }
  }

  return {
    selectedFileIds,
    selectionMode,
    setSelectionMode,
    trashTargets,
    setTrashTargets,
    selectedCount,
    allSelectedOnPage,
    selectFileRow,
    toggleRowSelection,
    toggleSelectAll,
    clearSelection,
    setAnchor,
    requestTrash,
    requestBulkTrash,
    confirmTrash,
  };
}
