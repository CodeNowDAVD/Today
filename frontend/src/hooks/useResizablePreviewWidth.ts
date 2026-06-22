import { useCallback, useEffect, useRef, useState } from "react";

/** Ancho del separador tabla ↔ vista previa (debe coincidir con CSS). */
export const PREVIEW_SPLITTER_WIDTH = 5;
const STORAGE_KEY = "sorbits_preview_width";
const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 200;
const MAX_WIDTH_RATIO = 0.72;

function readStoredWidth(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDTH;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= MIN_WIDTH ? n : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
}

function clampWidth(width: number, containerWidth: number): number {
  const max = Math.max(MIN_WIDTH, Math.floor(containerWidth * MAX_WIDTH_RATIO));
  return Math.min(max, Math.max(MIN_WIDTH, Math.round(width)));
}

export function useResizablePreviewWidth(containerRef: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(readStoredWidth);
  const widthRef = useRef(width);
  const draggingRef = useRef(false);

  widthRef.current = width;

  const resetWidth = useCallback(() => {
    setWidth(DEFAULT_WIDTH);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const onSplitterPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (window.matchMedia("(max-width: 900px)").matches) return;
      e.preventDefault();
      draggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      document.body.classList.add("is-resizing-preview");
    },
    [],
  );

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setWidth(clampWidth(rect.right - e.clientX, rect.width));
    };

    const onPointerUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.classList.remove("is-resizing-preview");
      try {
        localStorage.setItem(STORAGE_KEY, String(widthRef.current));
      } catch {
        /* ignore */
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      document.body.classList.remove("is-resizing-preview");
    };
  }, [containerRef]);

  return {
    previewWidth: width,
    onSplitterPointerDown,
    resetPreviewWidth: resetWidth,
  };
}
