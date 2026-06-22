import { useEffect, useRef, useState, type RefObject } from "react";

export const PDF_VIEWPORT_FALLBACK_WIDTH = 816;

const DEBOUNCE_MS = 140;
const WIDTH_SNAP = 12;

function snapWidth(width: number): number {
  if (width <= 0) return 0;
  return Math.max(120, Math.floor(width / WIDTH_SNAP) * WIDTH_SNAP);
}

function isPreviewSplitterDragging(): boolean {
  return document.body.classList.contains("is-resizing-preview");
}

/**
 * Ancho estable para render PDF: evita repintar canvas/text layer en cada px del splitter.
 */
export function useDebouncedViewportWidth(
  containerRef: RefObject<HTMLElement | null>,
  horizontalPadding: number,
): number {
  const [width, setWidth] = useState(0);
  const debounceRef = useRef<number | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const commit = (clientWidth: number, immediate: boolean) => {
      const next = snapWidth(clientWidth - horizontalPadding);
      if (next <= 0) return;

      if (immediate || !readyRef.current) {
        readyRef.current = true;
        setWidth(next);
        return;
      }

      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        setWidth(next);
      }, DEBOUNCE_MS);
    };

    const update = () => {
      if (isPreviewSplitterDragging()) return;
      commit(el.clientWidth, false);
    };

    const flushAfterDrag = () => {
      if (isPreviewSplitterDragging()) return;
      commit(el.clientWidth, true);
    };

    commit(el.clientWidth, true);
    const ro = new ResizeObserver(update);
    ro.observe(el);

    window.addEventListener("pointerup", flushAfterDrag);
    window.addEventListener("pointercancel", flushAfterDrag);

    return () => {
      ro.disconnect();
      window.removeEventListener("pointerup", flushAfterDrag);
      window.removeEventListener("pointercancel", flushAfterDrag);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [containerRef, horizontalPadding]);

  return width;
}
