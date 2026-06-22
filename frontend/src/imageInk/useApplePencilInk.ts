import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ApplePencilCapture,
  applePencilPressure,
  detectApplePencilEnv,
  predictPencilTail,
} from "./applePencil";
import { clientToImagePoint } from "./strokeUtils";
import type { InkLayout, InkPoint } from "./types";

type Options = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  layoutRef: React.RefObject<InkLayout | null>;
  penOnly: boolean;
  onLivePoints: (points: InkPoint[], penInput: boolean) => void;
  onStrokeEnd: (points: InkPoint[], penInput: boolean) => void;
};

export function useApplePencilInk({
  canvasRef,
  layoutRef,
  penOnly,
  onLivePoints,
  onStrokeEnd,
}: Options) {
  const env = useMemo(() => detectApplePencilEnv(), []);
  const captureRef = useRef<ApplePencilCapture | null>(null);
  const onLiveRef = useRef(onLivePoints);
  const onEndRef = useRef(onStrokeEnd);

  useEffect(() => {
    onLiveRef.current = onLivePoints;
    onEndRef.current = onStrokeEnd;
  }, [onLivePoints, onStrokeEnd]);

  const notifyLive = useCallback(() => {
    const capture = captureRef.current;
    const layout = layoutRef.current;
    if (!capture || !layout) return;
    let points = capture.getPoints();
    if (capture.penStroke && points.length >= 2) {
      points = predictPencilTail(points, layout.naturalWidth, layout.naturalHeight);
    }
    onLiveRef.current(points, capture.penStroke);
  }, [layoutRef]);

  useEffect(() => {
    const toPoint = (event: PointerEvent): InkPoint | null => {
      const canvas = canvasRef.current;
      const layout = layoutRef.current;
      if (!canvas || !layout) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return null;
      const pressure = event.pointerType === "pen" ? applePencilPressure(event) : 0.42;
      return clientToImagePoint(
        event.clientX,
        event.clientY,
        rect,
        layout.naturalWidth,
        layout.naturalHeight,
        pressure,
      );
    };

    captureRef.current = new ApplePencilCapture(
      toPoint,
      notifyLive,
      {
        palmRejection: env.isTabletInk,
        penOnly,
      },
    );
    return () => captureRef.current?.cancel();
    // Solo recrear si cambia el entorno tablet; penOnly se actualiza aparte.
  }, [canvasRef, env.isTabletInk, layoutRef, notifyLive]);

  useEffect(() => {
    captureRef.current?.updateOptions({
      palmRejection: env.isTabletInk,
      penOnly,
    });
  }, [env.isTabletInk, penOnly]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const capture = captureRef.current;
      if (!capture) return;
      if (capture.pointerDown(event.nativeEvent, event.currentTarget)) {
        notifyLive();
      }
    },
    [notifyLive],
  );

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    captureRef.current?.pointerMove(event.nativeEvent);
  }, []);

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const capture = captureRef.current;
    if (!capture) return;
    const result = capture.pointerUp(event.nativeEvent);
    if (result != null) onEndRef.current(result.points, result.penInput);
  }, []);

  const onPointerCancel = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const capture = captureRef.current;
    if (!capture) return;
    const result = capture.pointerCancel(event.nativeEvent);
    if (result != null) onEndRef.current(result.points, result.penInput);
  }, []);

  const onLostPointerCapture = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const capture = captureRef.current;
      if (!capture) return;
      const result = capture.lostPointerCapture(event.nativeEvent, event.currentTarget);
      if (result != null) onEndRef.current(result.points, result.penInput);
    },
    [],
  );

  return {
    env,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onLostPointerCapture,
    },
  };
}
