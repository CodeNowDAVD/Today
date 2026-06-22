import type { InkPoint } from "./types";

export type ApplePencilEnv = {
  /** iPad / tablet táctil donde tiene sentido el modo Pencil. */
  isTabletInk: boolean;
  /** Activar solo-Pencil por defecto en tablet. */
  defaultPenOnly: boolean;
};

export type ApplePencilOptions = {
  /** Ignorar dedo/muñeca mientras hay trazo con Pencil. */
  palmRejection: boolean;
  /** Solo aceptar pointerType === "pen". */
  penOnly: boolean;
};

type ToPointFn = (event: PointerEvent) => InkPoint | null;

/** Detecta entorno donde conviene el pipeline Apple Pencil. */
export function detectApplePencilEnv(): ApplePencilEnv {
  if (typeof window === "undefined") {
    return { isTabletInk: false, defaultPenOnly: false };
  }
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const touch = "ontouchstart" in window;
  const isTabletInk =
    touch && coarse && /iPad|Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
  const isMobileTouch = touch && coarse && !fine;
  return {
    isTabletInk: isTabletInk || isMobileTouch,
    defaultPenOnly: isTabletInk || isMobileTouch,
  };
}

/** Presión optimizada para Apple Pencil en Safari. */
export function applePencilPressure(event: PointerEvent): number {
  if (event.pointerType !== "pen") return 0.42;
  if (event.pressure > 0) {
    return Math.min(1, Math.max(0.08, event.pressure));
  }
  const w = event.width;
  if (typeof w === "number" && w > 0) {
    return Math.min(1, Math.max(0.12, w / 3.2));
  }
  return 0.55;
}

function minSampleDistSq(pen: boolean): number {
  return pen ? 0.008 : 0.25;
}

function maxGap(naturalWidth: number, naturalHeight: number, pen: boolean): number {
  const base = Math.max(naturalWidth, naturalHeight);
  if (pen) return Math.max(0.35, base * 0.00045);
  return Math.max(1.5, base * 0.0025);
}

/** Interpola puntos para trazos rápidos del Pencil. */
export function densifyPencilPoints(
  points: InkPoint[],
  naturalWidth: number,
  naturalHeight: number,
): InkPoint[] {
  if (points.length < 2) return points;
  const gap = maxGap(naturalWidth, naturalHeight, true);
  const out: InkPoint[] = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const a = out[out.length - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist > gap) {
      const steps = Math.ceil(dist / gap);
      for (let s = 1; s < steps; s += 1) {
        const t = s / steps;
        out.push({
          x: a.x + dx * t,
          y: a.y + dy * t,
          pressure: a.pressure + (b.pressure - a.pressure) * t,
        });
      }
    }
    if (dist >= gap * 0.08) out.push(b);
  }
  return out;
}

/** Predicción corta al final del trazo (solo vista previa en vivo). */
export function predictPencilTail(
  points: InkPoint[],
  naturalWidth: number,
  naturalHeight: number,
): InkPoint[] {
  if (points.length < 2) return points;
  const gap = maxGap(naturalWidth, naturalHeight, true);
  const n = points.length;
  const a = points[n - 2];
  const b = points[n - 1];
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const speed = Math.hypot(vx, vy);
  if (speed < gap * 0.5) return points;
  const steps = Math.min(6, Math.max(2, Math.ceil(speed / gap)));
  const out = [...points];
  for (let i = 1; i <= steps; i += 1) {
    const t = (i / steps) * 0.9;
    out.push({
      x: b.x + vx * t,
      y: b.y + vy * t,
      pressure: Math.max(0.08, b.pressure * (1 - t * 0.25)),
    });
  }
  return out;
}

export function normalizePencilStroke(
  points: InkPoint[],
  naturalWidth: number,
  naturalHeight: number,
  penInput: boolean,
): InkPoint[] {
  if (points.length < 2) return points;
  if (penInput) return densifyPencilPoints(points, naturalWidth, naturalHeight);
  return points;
}

type CaptureListener = () => void;

/**
 * Captura de trazos con Apple Pencil: rechazo de palma, un pointer activo,
 * muestras coalesced y sin cortar el trazo cuando la mano toca la pantalla.
 */
export class ApplePencilCapture {
  private activePointerId: number | null = null;
  private isPenStroke = false;
  private points: InkPoint[] = [];
  private palmBlockUntil = 0;
  private options: ApplePencilOptions;
  private toPoint: ToPointFn;
  private onChange: CaptureListener;

  constructor(toPoint: ToPointFn, onChange: CaptureListener, options: ApplePencilOptions) {
    this.toPoint = toPoint;
    this.onChange = onChange;
    this.options = options;
  }

  updateOptions(options: Partial<ApplePencilOptions>) {
    this.options = { ...this.options, ...options };
  }

  get isDrawing(): boolean {
    return this.activePointerId != null;
  }

  get penStroke(): boolean {
    return this.isPenStroke;
  }

  getPoints(): InkPoint[] {
    return this.points;
  }

  private palmBlocked(): boolean {
    return Date.now() < this.palmBlockUntil;
  }

  private blockPalm(ms = 120) {
    this.palmBlockUntil = Date.now() + ms;
  }

  shouldAcceptPointerDown(event: PointerEvent): boolean {
    if (this.activePointerId != null) return false;
    if (event.pointerType === "touch") {
      if (this.options.palmRejection || this.options.penOnly) return false;
      if (this.palmBlocked()) return false;
    }
    if (this.options.penOnly && event.pointerType !== "pen") return false;
    return event.pointerType === "pen" || event.pointerType === "mouse" || event.pointerType === "touch";
  }

  private shouldTrackPointer(event: PointerEvent): boolean {
    if (this.activePointerId == null) return false;
    return event.pointerId === this.activePointerId;
  }

  pointerDown(event: PointerEvent, element: HTMLElement): boolean {
    if (!this.shouldAcceptPointerDown(event)) return false;
    event.preventDefault();
    this.activePointerId = event.pointerId;
    this.isPenStroke = event.pointerType === "pen";
    this.points = [];
    if (this.isPenStroke) this.blockPalm();
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      /* noop */
    }
    return this.pushSample(event);
  }

  pointerMove(event: PointerEvent): boolean {
    if (!this.shouldTrackPointer(event)) return false;
    event.preventDefault();
    let changed = false;
    const batch = event.getCoalescedEvents?.() ?? [event];
    for (const sample of batch) {
      if (sample.pointerId !== this.activePointerId) continue;
      if (this.pushSample(sample)) changed = true;
    }
    if (changed) this.onChange();
    return changed;
  }

  /** Finaliza solo si el evento es del pointer activo (no la palma). */
  pointerUp(event: PointerEvent): { points: InkPoint[]; penInput: boolean } | null {
    if (!this.shouldTrackPointer(event)) return null;
    event.preventDefault();
    return this.endCapture();
  }

  pointerCancel(event: PointerEvent): { points: InkPoint[]; penInput: boolean } | null {
    if (!this.shouldTrackPointer(event)) return null;
    return this.endCapture();
  }

  /**
   * Safari puede disparar lostpointercapture al apoyar la mano.
   * No cerrar el trazo salvo que sea el Pencil soltando.
   */
  lostPointerCapture(
    event: PointerEvent,
    element: HTMLElement,
  ): { points: InkPoint[]; penInput: boolean } | null {
    if (this.activePointerId == null) return null;
    if (event.pointerId !== this.activePointerId) return null;

    if (this.isPenStroke && event.pointerType !== "pen") {
      try {
        element.setPointerCapture(this.activePointerId);
      } catch {
        /* noop */
      }
      return null;
    }

    return this.endCapture();
  }

  private endCapture(): { points: InkPoint[]; penInput: boolean } {
    const finished = [...this.points];
    const penInput = this.isPenStroke;
    this.activePointerId = null;
    this.isPenStroke = false;
    this.points = [];
    if (finished.length > 0) this.blockPalm();
    this.onChange();
    return { points: finished, penInput };
  }

  cancel() {
    this.activePointerId = null;
    this.isPenStroke = false;
    this.points = [];
    this.onChange();
  }

  private pushSample(event: PointerEvent): boolean {
    const point = this.toPoint(event);
    if (!point) return false;
    const last = this.points[this.points.length - 1];
    const minSq = minSampleDistSq(this.isPenStroke);
    if (last) {
      const dx = point.x - last.x;
      const dy = point.y - last.y;
      if (dx * dx + dy * dy < minSq) return false;
    }
    this.points.push(point);
    return true;
  }
}
