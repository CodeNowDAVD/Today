import getStroke from "perfect-freehand";
import { normalizePencilStroke } from "./applePencil";
import type { InkPoint, InkStroke } from "./types";

type StrokeConfig = {
  size: number;
  thinning: number;
  smoothing: number;
  streamline: number;
  simulatePressure: boolean;
  easing: (t: number) => number;
  start: { taper: number; cap: boolean };
  end: { taper: number; cap: boolean };
};

const PEN_CONFIG: StrokeConfig = {
  size: 16,
  thinning: 0.55,
  smoothing: 0.88,
  streamline: 0.82,
  simulatePressure: false,
  easing: (t) => t,
  start: { taper: 8, cap: true },
  end: { taper: 8, cap: true },
};

const PEN_FINGER_CONFIG: StrokeConfig = {
  ...PEN_CONFIG,
  simulatePressure: true,
  smoothing: 0.75,
  streamline: 0.65,
};

const HIGHLIGHTER_CONFIG: StrokeConfig = {
  size: 28,
  thinning: 0.25,
  smoothing: 0.9,
  streamline: 0.85,
  simulatePressure: false,
  easing: (t) => t,
  start: { taper: 0, cap: true },
  end: { taper: 0, cap: true },
};

const ERASER_CONFIG: StrokeConfig = {
  size: 32,
  thinning: 0.15,
  smoothing: 0.7,
  streamline: 0.6,
  simulatePressure: true,
  easing: (t) => t,
  start: { taper: 0, cap: true },
  end: { taper: 0, cap: true },
};

function toolConfig(tool: InkStroke["tool"], useSimulatedPressure: boolean): StrokeConfig {
  if (tool === "highlighter") return HIGHLIGHTER_CONFIG;
  if (tool === "eraser") return ERASER_CONFIG;
  return useSimulatedPressure ? PEN_FINGER_CONFIG : PEN_CONFIG;
}

function hasVariablePressure(points: InkPoint[]): boolean {
  if (points.length < 2) return false;
  let min = points[0].pressure;
  let max = points[0].pressure;
  for (const p of points) {
    min = Math.min(min, p.pressure);
    max = Math.max(max, p.pressure);
  }
  return max - min > 0.04;
}

function toInputPoints(points: InkPoint[]): number[][] {
  return points.map((p) => [p.x, p.y, p.pressure]);
}

/** Rellena huecos entre muestras del Apple Pencil para evitar segmentos rectos. */
export function densifyPoints(points: InkPoint[], maxGap: number): InkPoint[] {
  if (points.length < 2) return points;
  const out: InkPoint[] = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const a = out[out.length - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxGap) {
      const steps = Math.ceil(dist / maxGap);
      for (let s = 1; s < steps; s += 1) {
        const t = s / steps;
        out.push({
          x: a.x + dx * t,
          y: a.y + dy * t,
          pressure: a.pressure + (b.pressure - a.pressure) * t,
        });
      }
    }
    if (dist >= maxGap * 0.15) {
      out.push(b);
    }
  }
  return out;
}

export function maxPointGap(
  naturalWidth: number,
  naturalHeight: number,
  penInput = false,
): number {
  const base = Math.max(naturalWidth, naturalHeight);
  if (penInput) {
    return Math.max(0.5, base * 0.0006);
  }
  return Math.max(1.5, base * 0.0025);
}

export function normalizeStrokePoints(
  points: InkPoint[],
  naturalWidth: number,
  naturalHeight: number,
  penInput = false,
): InkPoint[] {
  if (points.length < 2) return points;
  if (penInput) {
    return normalizePencilStroke(points, naturalWidth, naturalHeight, true);
  }
  return densifyPoints(points, maxPointGap(naturalWidth, naturalHeight, false));
}

export function strokePolygon(
  stroke: InkPoint[],
  tool: InkStroke["tool"],
  size: number,
): number[][] {
  if (stroke.length < 1) return [];
  const useSimulated = tool === "pen" && !hasVariablePressure(stroke);
  const config = toolConfig(tool, useSimulated);
  const input =
    stroke.length === 1
      ? [
          [stroke[0].x, stroke[0].y, stroke[0].pressure],
          [stroke[0].x + 0.05, stroke[0].y + 0.05, stroke[0].pressure],
        ]
      : toInputPoints(stroke);
  return getStroke(input, {
    ...config,
    size: size * (tool === "highlighter" ? 1.8 : 1),
  });
}

export function drawStrokePath(
  ctx: CanvasRenderingContext2D,
  polygon: number[][],
  color: string,
  opacity: number,
  composite: GlobalCompositeOperation = "source-over",
) {
  if (polygon.length < 3) return;
  ctx.save();
  ctx.globalCompositeOperation = composite;
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(polygon[0][0], polygon[0][1]);
  for (let i = 1; i < polygon.length; i += 1) {
    ctx.lineTo(polygon[i][0], polygon[i][1]);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke: InkStroke,
  coordScale: number,
  naturalWidth: number,
  naturalHeight: number,
) {
  const normalized = normalizeStrokePoints(
    stroke.points,
    naturalWidth,
    naturalHeight,
    stroke.penInput,
  );
  const points = normalized.map((p) => ({
    x: p.x * coordScale,
    y: p.y * coordScale,
    pressure: p.pressure,
  }));
  const polygon = strokePolygon(points, stroke.tool, displayStrokeSize(stroke.size));
  if (stroke.tool === "eraser") return;
  drawStrokePath(ctx, polygon, stroke.color, stroke.opacity);
}

export function displayStrokeSize(sliderSize: number): number {
  return 4 + sliderSize * 3;
}

export function eraseStrokes(
  strokes: InkStroke[],
  eraserPoints: InkPoint[],
  eraserSize: number,
): InkStroke[] {
  if (eraserPoints.length < 2) return strokes;
  const radius = eraserSize * 1.2;
  const radiusSq = radius * radius;
  return strokes.filter((stroke) => {
    if (stroke.tool === "eraser") return false;
    for (const ep of eraserPoints) {
      for (const sp of stroke.points) {
        const dx = ep.x - sp.x;
        const dy = ep.y - sp.y;
        if (dx * dx + dy * dy <= radiusSq) return false;
      }
    }
    return true;
  });
}

export function clientToImagePoint(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  naturalWidth: number,
  naturalHeight: number,
  pressure: number,
): InkPoint {
  const x = ((clientX - canvasRect.left) / canvasRect.width) * naturalWidth;
  const y = ((clientY - canvasRect.top) / canvasRect.height) * naturalHeight;
  return { x, y, pressure };
}

export function pointerPressure(event: PointerEvent): number {
  if (event.pointerType === "pen") {
    // Safari/iPad suele enviar 0.5 como presión válida — no descartarla.
    if (event.pressure > 0) {
      return Math.min(1, Math.max(0.08, event.pressure));
    }
    if (typeof event.width === "number" && event.width > 0) {
      return Math.min(1, Math.max(0.15, event.width / 3.5));
    }
    return 0.55;
  }
  return 0.42;
}
