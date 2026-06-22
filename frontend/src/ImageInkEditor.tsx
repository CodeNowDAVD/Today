import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Eraser,
  Highlighter,
  PenLine,
  Redo2,
  SlidersHorizontal,
  Undo2,
} from "lucide-react";
import { replaceFileContent, type FileItem } from "./api";
import { defaultImageSaveType } from "./filePreview";
import { detectApplePencilEnv } from "./imageInk/applePencil";
import {
  displayStrokeSize,
  drawStrokePath,
  eraseStrokes,
  normalizeStrokePoints,
  renderStroke,
  strokePolygon,
} from "./imageInk/strokeUtils";
import type { InkLayout, InkPoint, InkStroke, InkTool } from "./imageInk/types";
import { useApplePencilInk } from "./imageInk/useApplePencilInk";

type Props = {
  file: FileItem;
  sourceUrl: string;
  onSaved: (file: FileItem) => void;
  onClose: () => void;
  onError: (message: string) => void;
  onOpenAdvanced?: () => void;
};

const PEN_COLORS = ["#1d1d1f", "#007aff", "#ff3b30", "#34c759"];
const HIGHLIGHTER_COLORS = ["#ffd60a", "#30d158", "#ff6482", "#64d2ff"];

function nextStrokeId(): string {
  return `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function computeLayout(
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number,
): InkLayout | null {
  if (containerWidth < 1 || containerHeight < 1 || naturalWidth < 1 || naturalHeight < 1) {
    return null;
  }
  const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
  const drawWidth = naturalWidth * scale;
  const drawHeight = naturalHeight * scale;
  return {
    naturalWidth,
    naturalHeight,
    drawWidth,
    drawHeight,
    offsetX: (containerWidth - drawWidth) / 2,
    offsetY: (containerHeight - drawHeight) / 2,
  };
}

function exportMimeType(originalName: string): string {
  const ext = originalName.includes(".")
    ? originalName.slice(originalName.lastIndexOf(".") + 1).toLowerCase()
    : "png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "image/png";
}

function canvasDpr(): number {
  return Math.min(window.devicePixelRatio || 1, 3);
}

function setupCanvasSize(
  canvas: HTMLCanvasElement,
  drawWidth: number,
  drawHeight: number,
  dpr: number,
) {
  canvas.width = Math.round(drawWidth * dpr);
  canvas.height = Math.round(drawHeight * dpr);
  canvas.style.width = `${drawWidth}px`;
  canvas.style.height = `${drawHeight}px`;
}

function prepareCtx(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const dpr = canvasDpr();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

function toDisplayPoints(points: InkPoint[], layout: InkLayout): InkPoint[] {
  const sx = layout.drawWidth / layout.naturalWidth;
  const sy = layout.drawHeight / layout.naturalHeight;
  return points.map((p) => ({ x: p.x * sx, y: p.y * sy, pressure: p.pressure }));
}

export default function ImageInkEditor({
  file,
  sourceUrl,
  onSaved,
  onClose,
  onError,
  onOpenAdvanced,
}: Props) {
  const pencilEnv = useMemo(() => detectApplePencilEnv(), []);

  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const livePointsRef = useRef<InkPoint[]>([]);
  const livePenRef = useRef(false);
  const layoutRef = useRef<InkLayout | null>(null);
  const paintRafRef = useRef<number | null>(null);
  const canvasSizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const strokesRef = useRef<InkStroke[]>([]);

  const [tool, setTool] = useState<InkTool>("pen");
  const [penColor, setPenColor] = useState(PEN_COLORS[1]);
  const [highlighterColor, setHighlighterColor] = useState(HIGHLIGHTER_COLORS[0]);
  const [size, setSize] = useState(3);
  const [penOnly, setPenOnly] = useState(pencilEnv.defaultPenOnly);
  const [saving, setSaving] = useState(false);
  const [layout, setLayout] = useState<InkLayout | null>(null);
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [undoStack, setUndoStack] = useState<InkStroke[][]>([[]]);
  const [undoIndex, setUndoIndex] = useState(0);
  const [imageReady, setImageReady] = useState(false);

  const activeColor = tool === "highlighter" ? highlighterColor : penColor;
  const activeOpacity = tool === "highlighter" ? 0.38 : 1;
  const colorChoices = tool === "highlighter" ? HIGHLIGHTER_COLORS : PEN_COLORS;
  const displaySize = displayStrokeSize(size);

  const canUndo = undoIndex > 0;
  const canRedo = undoIndex < undoStack.length - 1;

  const syncLayout = useCallback(() => {
    const img = imageRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const next = computeLayout(
      container.getBoundingClientRect().width,
      container.getBoundingClientRect().height,
      img.naturalWidth,
      img.naturalHeight,
    );
    layoutRef.current = next;
    setLayout(next);
  }, []);

  const pushHistory = useCallback((next: InkStroke[]) => {
    setUndoStack((prev) => {
      const trimmed = prev.slice(0, undoIndex + 1);
      return [...trimmed, next];
    });
    setUndoIndex((i) => i + 1);
    strokesRef.current = next;
    setStrokes(next);
  }, [undoIndex]);

  const ensureCanvasSizes = useCallback((drawWidth: number, drawHeight: number) => {
    const dpr = canvasDpr();
    const bg = bgCanvasRef.current;
    const ink = inkCanvasRef.current;
    if (!bg || !ink) return;
    const sizeKey = canvasSizeRef.current;
    if (sizeKey.width === drawWidth && sizeKey.height === drawHeight && sizeKey.dpr === dpr) {
      return;
    }
    setupCanvasSize(bg, drawWidth, drawHeight, dpr);
    setupCanvasSize(ink, drawWidth, drawHeight, dpr);
    canvasSizeRef.current = { width: drawWidth, height: drawHeight, dpr };
  }, []);

  const paintBackground = useCallback(() => {
    const bg = bgCanvasRef.current;
    const img = imageRef.current;
    const currentLayout = layoutRef.current;
    if (!bg || !img || !currentLayout) return;
    const { drawWidth, drawHeight } = currentLayout;
    if (drawWidth < 1 || drawHeight < 1) return;
    ensureCanvasSizes(drawWidth, drawHeight);
    const ctx = prepareCtx(bg);
    if (!ctx) return;
    ctx.clearRect(0, 0, drawWidth, drawHeight);
    ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
  }, [ensureCanvasSizes]);

  const paintInk = useCallback(
    (previewPoints?: InkPoint[], previewPen = livePenRef.current) => {
      const ink = inkCanvasRef.current;
      const currentLayout = layoutRef.current;
      if (!ink || !currentLayout) return;

      const { drawWidth, drawHeight, naturalWidth, naturalHeight } = currentLayout;
      if (drawWidth < 1 || drawHeight < 1) return;

      ensureCanvasSizes(drawWidth, drawHeight);
      const ctx = prepareCtx(ink);
      if (!ctx) return;

      ctx.clearRect(0, 0, drawWidth, drawHeight);
      const coordScale = drawWidth / naturalWidth;
      const currentStrokes = strokesRef.current;

      for (const stroke of currentStrokes) {
        renderStroke(ctx, stroke, coordScale, naturalWidth, naturalHeight);
      }

      const livePoints = previewPoints ?? livePointsRef.current;
      if (livePoints.length >= 1 && tool !== "eraser") {
        const normalized = normalizeStrokePoints(
          livePoints,
          naturalWidth,
          naturalHeight,
          previewPen,
        );
        const displayPreview = toDisplayPoints(normalized, currentLayout);
        const polygon = strokePolygon(displayPreview, tool, displaySize);
        drawStrokePath(ctx, polygon, activeColor, activeOpacity);
      }
    },
    [activeColor, activeOpacity, displaySize, ensureCanvasSizes, tool],
  );

  const paintAll = useCallback(
    (previewPoints?: InkPoint[]) => {
      paintBackground();
      paintInk(previewPoints);
    },
    [paintBackground, paintInk],
  );

  const scheduleInkPaint = useCallback(() => {
    if (paintRafRef.current != null) return;
    paintRafRef.current = window.requestAnimationFrame(() => {
      paintRafRef.current = null;
      paintInk(livePointsRef.current, livePenRef.current);
    });
  }, [paintInk]);

  const commitStroke = useCallback(
    (points: InkPoint[], penInput: boolean) => {
      const currentLayout = layoutRef.current;
      if (points.length < 1 || !currentLayout) return;
      livePointsRef.current = [];
      livePenRef.current = false;
      const normalized = normalizeStrokePoints(
        points,
        currentLayout.naturalWidth,
        currentLayout.naturalHeight,
        penInput,
      );
      if (tool === "eraser") {
        if (normalized.length < 2) return;
        pushHistory(eraseStrokes(strokesRef.current, normalized, size * 8));
        paintInk();
        return;
      }
      pushHistory([
        ...strokesRef.current,
        {
          id: nextStrokeId(),
          tool,
          color: activeColor,
          size,
          opacity: activeOpacity,
          points: normalized,
          penInput,
        },
      ]);
    },
    [activeColor, activeOpacity, paintInk, pushHistory, size, tool],
  );

  const onLivePoints = useCallback(
    (points: InkPoint[], penInput: boolean) => {
      livePointsRef.current = points;
      livePenRef.current = penInput;
      scheduleInkPaint();
    },
    [scheduleInkPaint],
  );

  const onStrokeEnd = useCallback(
    (points: InkPoint[], penInput: boolean) => {
      commitStroke(points, penInput);
    },
    [commitStroke],
  );

  const { handlers } = useApplePencilInk({
    canvasRef: inkCanvasRef,
    layoutRef,
    penOnly,
    onLivePoints,
    onStrokeEnd,
  });

  useEffect(() => {
    strokesRef.current = strokes;
    paintAll();
  }, [paintAll, strokes, layout]);

  useEffect(() => {
    const img = new Image();
    if (!sourceUrl.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      imageRef.current = img;
      setImageReady(true);
      syncLayout();
    };
    img.onerror = () => onError("No se pudo cargar la imagen");
    img.src = sourceUrl;
  }, [onError, sourceUrl, syncLayout]);

  useEffect(() => {
    if (!imageReady) return;
    const container = containerRef.current;
    if (!container) return;
    syncLayout();
    const observer = new ResizeObserver(() => syncLayout());
    observer.observe(container);
    return () => observer.disconnect();
  }, [imageReady, syncLayout]);

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const nextIndex = undoIndex - 1;
    setUndoIndex(nextIndex);
    const next = undoStack[nextIndex] ?? [];
    strokesRef.current = next;
    setStrokes(next);
  }, [canUndo, undoIndex, undoStack]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    const nextIndex = undoIndex + 1;
    setUndoIndex(nextIndex);
    const next = undoStack[nextIndex] ?? [];
    strokesRef.current = next;
    setStrokes(next);
  }, [canRedo, undoIndex, undoStack]);

  const handleSave = useCallback(async () => {
    const img = imageRef.current;
    if (!img || saving) return;
    setSaving(true);
    try {
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = img.naturalWidth;
      exportCanvas.height = img.naturalHeight;
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) throw new Error("Canvas no disponible");
      ctx.drawImage(img, 0, 0);
      for (const stroke of strokes) {
        renderStroke(ctx, stroke, 1, img.naturalWidth, img.naturalHeight);
      }
      const mimeType = exportMimeType(file.originalName);
      const quality = mimeType === "image/jpeg" ? 0.92 : undefined;
      const blob = await new Promise<Blob>((resolve, reject) => {
        exportCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("No se pudo exportar"))),
          mimeType,
          quality,
        );
      });
      const ext = defaultImageSaveType(file.originalName);
      const updated = await replaceFileContent(
        file.id,
        new File([blob], file.originalName, { type: mimeType || `image/${ext}` }),
      );
      onSaved(updated);
    } catch (e) {
      onError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }, [file, onError, onSaved, saving, strokes]);

  const toolButtons = useMemo(
    () => [
      { id: "pen" as const, label: "Pluma", icon: PenLine },
      { id: "highlighter" as const, label: "Resaltador", icon: Highlighter },
      { id: "eraser" as const, label: "Borrador", icon: Eraser },
    ],
    [],
  );

  return createPortal(
    <div className="image-ink-editor" role="dialog" aria-modal="true" aria-label="Anotar imagen">
      <header className="image-ink-editor__head">
        <button type="button" className="image-ink-editor__back" onClick={onClose}>
          Cancelar
        </button>
        <span className="image-ink-editor__title">{file.originalName}</span>
        <div className="image-ink-editor__head-actions">
          <button
            type="button"
            className="image-ink-editor__icon-btn"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Deshacer"
            aria-label="Deshacer"
          >
            <Undo2 size={18} />
          </button>
          <button
            type="button"
            className="image-ink-editor__icon-btn"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Rehacer"
            aria-label="Rehacer"
          >
            <Redo2 size={18} />
          </button>
          {onOpenAdvanced && (
            <button
              type="button"
              className="image-ink-editor__secondary-btn"
              onClick={onOpenAdvanced}
              title="Recortar, rotar y más"
            >
              <SlidersHorizontal size={16} />
              <span>Recortar</span>
            </button>
          )}
          <button
            type="button"
            className="image-ink-editor__save-btn"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </header>

      <div ref={containerRef} className="image-ink-editor__stage">
        {layout && imageReady && (
          <div
            className="image-ink-editor__canvas-stack"
            style={{
              left: layout.offsetX,
              top: layout.offsetY,
              width: layout.drawWidth,
              height: layout.drawHeight,
            }}
          >
            <canvas
              ref={bgCanvasRef}
              className="image-ink-editor__canvas image-ink-editor__canvas--bg"
              aria-hidden
            />
            <canvas
              ref={inkCanvasRef}
              className="image-ink-editor__canvas image-ink-editor__canvas--ink"
              style={{ touchAction: "none" }}
              {...handlers}
            />
          </div>
        )}
        {!layout && imageReady && (
          <p className="image-ink-editor__status">Preparando lienzo…</p>
        )}
      </div>

      <footer className="image-ink-editor__toolbar">
        <div className="image-ink-editor__tools" role="tablist" aria-label="Herramientas">
          {toolButtons.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tool === id}
              className={["image-ink-editor__tool", tool === id && "is-active"].filter(Boolean).join(" ")}
              onClick={() => setTool(id)}
              title={label}
            >
              <Icon size={20} strokeWidth={2.1} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {tool !== "eraser" && (
          <div className="image-ink-editor__colors" aria-label="Color">
            {colorChoices.map((color) => (
              <button
                key={color}
                type="button"
                className={[
                  "image-ink-editor__color",
                  activeColor === color && "is-active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ backgroundColor: color }}
                onClick={() =>
                  tool === "highlighter" ? setHighlighterColor(color) : setPenColor(color)
                }
                aria-label={`Color ${color}`}
              />
            ))}
          </div>
        )}

        <label className="image-ink-editor__size">
          <span>Grosor</span>
          <input
            type="range"
            min={1}
            max={8}
            step={1}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </label>

        <label className="image-ink-editor__pencil-only">
          <input
            type="checkbox"
            checked={penOnly}
            onChange={(e) => setPenOnly(e.target.checked)}
          />
          <span>Solo Apple Pencil</span>
        </label>
      </footer>
    </div>,
    document.body,
  );
}
