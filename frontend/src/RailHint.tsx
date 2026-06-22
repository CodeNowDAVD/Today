import { createPortal } from "react-dom";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Hint = { label: string; x: number; y: number };

type RailHintContextValue = {
  show: (label: string, el: HTMLElement) => void;
  hide: () => void;
};

const RailHintContext = createContext<RailHintContextValue | null>(null);

export function RailHintProvider({ children }: { children: ReactNode }) {
  const [hint, setHint] = useState<Hint | null>(null);
  const hideTimer = useRef<number | null>(null);

  const hide = useCallback(() => {
    if (hideTimer.current != null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setHint(null);
  }, []);

  const show = useCallback(
    (label: string, el: HTMLElement) => {
      if (hideTimer.current != null) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      const rect = el.getBoundingClientRect();
      setHint({
        label,
        x: rect.right + 10,
        y: rect.top + rect.height / 2,
      });
    },
    [],
  );

  useEffect(() => () => hide(), [hide]);

  return (
    <RailHintContext.Provider value={{ show, hide }}>
      {children}
      {hint
        ? createPortal(
            <div
              className="rail-floating-hint"
              style={{ left: hint.x, top: hint.y }}
              role="tooltip"
            >
              {hint.label}
            </div>,
            document.body,
          )
        : null}
    </RailHintContext.Provider>
  );
}

export function useRailHint() {
  return useContext(RailHintContext);
}

type RailHintTargetProps = {
  label: string;
  enabled?: boolean;
  children: ReactNode;
  className?: string;
};

/** Envuelve un botón del rail y muestra el nombre completo al pasar el ratón. */
export function RailHintTarget({ label, enabled = true, children, className }: RailHintTargetProps) {
  const ctx = useRailHint();

  useEffect(() => {
    if (!enabled) ctx?.hide();
    return () => {
      ctx?.hide();
    };
  }, [enabled, ctx]);

  if (!enabled || !ctx) {
    return <>{children}</>;
  }

  return (
    <span
      className={["rail-hint-target", className].filter(Boolean).join(" ")}
      onMouseEnter={(e) => ctx.show(label, e.currentTarget)}
      onMouseLeave={() => ctx.hide()}
      onFocus={(e) => ctx.show(label, e.currentTarget)}
      onBlur={() => ctx.hide()}
      onClick={() => ctx.hide()}
    >
      {children}
    </span>
  );
}

/** Oculta hints al cambiar el estado del sidebar (p. ej. expandir con clic). */
export function RailHintCollapseSync({ collapsed }: { collapsed: boolean }) {
  const ctx = useRailHint();
  useEffect(() => {
    ctx?.hide();
  }, [collapsed, ctx]);
  return null;
}
