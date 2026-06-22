import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

export type FileRowMenuItem = {
  key: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
};

type Props = {
  items: FileRowMenuItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Un botón ⋯ fijo por fila; menú anclado con targets grandes (sin hover ni anticlic). */
export default function FileRowMenuButton({ items, open, onOpenChange }: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPos(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const panelW = 200;
    const left = Math.max(8, Math.min(rect.right - panelW, window.innerWidth - panelW - 8));
    setPos({ top: rect.bottom + 4, left });
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onOpenChange(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  if (items.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`file-row-menu-btn${open ? " is-open" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Acciones del archivo"
        title="Acciones"
      >
        <MoreHorizontal size={18} strokeWidth={2.25} aria-hidden />
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={panelRef}
              className="file-row-menu-panel"
              style={{ top: pos.top, left: pos.left }}
              role="menu"
            >
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={[
                    "file-row-menu-panel__item",
                    item.danger && "file-row-menu-panel__item--danger",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenChange(false);
                    item.onClick();
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
