import { Minus, Plus } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const MIN_SCALE = 0.1;
const MAX_SCALE = 10;
const ZOOM_STEP = 1.12;

type Props = {
  children: ReactNode;
  className?: string;
  /** Reinicia zoom y scroll al cambiar de documento. */
  resetKey?: string | number;
};

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function zoomAtPoint(
  container: HTMLDivElement,
  prevScale: number,
  nextScale: number,
  clientX: number,
  clientY: number,
): void {
  if (prevScale === nextScale) return;
  const rect = container.getBoundingClientRect();
  const offsetX = clientX - rect.left + container.scrollLeft;
  const offsetY = clientY - rect.top + container.scrollTop;
  const contentX = offsetX / prevScale;
  const contentY = offsetY / prevScale;
  requestAnimationFrame(() => {
    container.scrollLeft = contentX * nextScale - (clientX - rect.left);
    container.scrollTop = contentY * nextScale - (clientY - rect.top);
  });
}

export default function PreviewZoomViewport({ children, className, resetKey }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [baseWidth, setBaseWidth] = useState(0);
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setScale(1);
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    }
  }, [resetKey]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateViewport = () => setBaseWidth(el.clientWidth);
    updateViewport();

    const ro = new ResizeObserver(updateViewport);
    ro.observe(el);
    return () => ro.disconnect();
  }, [resetKey]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const update = () => {
      setContentSize({ width: el.scrollWidth, height: el.scrollHeight });
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    for (const child of el.children) {
      ro.observe(child);
    }
    return () => ro.disconnect();
  }, [children, resetKey, baseWidth]);

  const applyZoom = useCallback((factor: number, clientX?: number, clientY?: number) => {
    const container = scrollRef.current;
    if (!container) return;

    setScale((prev) => {
      const next = clampScale(prev * factor);
      if (next === prev) return prev;

      const rect = container.getBoundingClientRect();
      const cx = clientX ?? rect.left + rect.width / 2;
      const cy = clientY ?? rect.top + rect.height / 2;
      zoomAtPoint(container, prev, next, cx, cy);
      return next;
    });
  }, []);

  const onWheel = useCallback(
    (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();

      let delta = event.deltaY;
      if (event.deltaMode === 1) delta *= 16;
      if (event.deltaMode === 2) {
        const container = scrollRef.current;
        delta *= container?.clientHeight ?? 100;
      }

      let factor = Math.exp(-delta * 0.0025);
      factor = Math.max(0.98, Math.min(1.02, factor));
      applyZoom(factor, event.clientX, event.clientY);
    },
    [applyZoom],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const zoomIn = useCallback(() => applyZoom(ZOOM_STEP), [applyZoom]);
  const zoomOut = useCallback(() => applyZoom(1 / ZOOM_STEP), [applyZoom]);
  const resetZoom = useCallback(() => {
    setScale(1);
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    }
  }, []);

  const layoutWidth = Math.max(baseWidth, contentSize.width);
  const stageWidth = layoutWidth * scale;
  const stageHeight = contentSize.height * scale;

  const rootClass = ["preview-zoom-viewport", className].filter(Boolean).join(" ");

  return (
    <div className={rootClass}>
      <div className="preview-zoom-viewport__toolbar" role="toolbar" aria-label="Zoom de vista previa">
        <button
          type="button"
          className="preview-zoom-viewport__btn"
          onClick={zoomOut}
          disabled={scale <= MIN_SCALE}
          aria-label="Alejar"
          title="Alejar (Ctrl + scroll)"
        >
          <Minus size={16} strokeWidth={2.25} aria-hidden />
        </button>
        <button
          type="button"
          className="preview-zoom-viewport__scale"
          onClick={resetZoom}
          aria-label={`Zoom ${Math.round(scale * 100)}%, restablecer`}
          title="Restablecer zoom"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          type="button"
          className="preview-zoom-viewport__btn"
          onClick={zoomIn}
          disabled={scale >= MAX_SCALE}
          aria-label="Acercar"
          title="Acercar (Ctrl + scroll)"
        >
          <Plus size={16} strokeWidth={2.25} aria-hidden />
        </button>
      </div>

      <div ref={scrollRef} className="preview-zoom-viewport__scroll">
        <div
          className="preview-zoom-viewport__stage"
          style={{
            width: stageWidth > 0 ? stageWidth : undefined,
            height: stageHeight > 0 ? stageHeight : undefined,
          }}
        >
          <div
            ref={contentRef}
            className="preview-zoom-viewport__content"
            style={{
              width: baseWidth > 0 ? baseWidth : undefined,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
