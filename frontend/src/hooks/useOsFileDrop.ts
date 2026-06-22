import { useCallback, useEffect, useRef, useState } from "react";
import {
  filesFromDataTransfer,
  isInternalAppDrag,
  mayAcceptOsFileDrop,
  toFileList,
} from "../fileDrag";

export function useOsFileDrop(
  enabled: boolean,
  onDropFiles: (files: FileList) => void,
  onHoverFolderClear?: () => void,
) {
  const [dragOver, setDragOver] = useState(false);
  const depthRef = useRef(0);
  const onDropFilesRef = useRef(onDropFiles);
  onDropFilesRef.current = onDropFiles;

  const accepts = useCallback((dataTransfer: DataTransfer) => {
    return mayAcceptOsFileDrop(dataTransfer);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onWindowDragOver = (event: DragEvent) => {
      if (!event.dataTransfer || isInternalAppDrag(event.dataTransfer)) return;
      if (accepts(event.dataTransfer)) {
        event.preventDefault();
      }
    };

    window.addEventListener("dragover", onWindowDragOver);
    return () => window.removeEventListener("dragover", onWindowDragOver);
  }, [enabled, accepts]);

  useEffect(() => {
    if (!enabled) {
      depthRef.current = 0;
      setDragOver(false);
    }
  }, [enabled]);

  function onEnter(e: React.DragEvent) {
    if (!enabled || !accepts(e.dataTransfer)) return;
    e.preventDefault();
    depthRef.current += 1;
    setDragOver(true);
  }

  function onOver(e: React.DragEvent) {
    if (!enabled || isInternalAppDrag(e.dataTransfer)) return;
    if (!accepts(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  }

  function onLeave(e: React.DragEvent) {
    if (!enabled || depthRef.current === 0) return;
    e.preventDefault();
    depthRef.current = Math.max(0, depthRef.current - 1);
    if (depthRef.current === 0) {
      setDragOver(false);
      onHoverFolderClear?.();
    }
  }

  function onDrop(e: React.DragEvent) {
    if (!enabled || isInternalAppDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    depthRef.current = 0;
    setDragOver(false);
    onHoverFolderClear?.();

    const picked = filesFromDataTransfer(e.dataTransfer);
    if (picked.length) {
      onDropFilesRef.current(toFileList(picked));
    }
  }

  return { dragOver, onEnter, onOver, onLeave, onDrop };
}
