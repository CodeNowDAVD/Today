import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ToolbarIcon from "./ToolbarIcons";

export type ToolbarOverflowItem = {
  key: string;
  label: string;
  onClick: () => void;
  checked?: boolean;
};

type Props = {
  items: ToolbarOverflowItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ToolbarOverflowMenu({ items, open, onOpenChange }: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPos(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const panelW = 220;
    const left = Math.max(8, Math.min(rect.right - panelW, window.innerWidth - panelW - 8));
    setPos({ top: rect.bottom + 6, left });
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`btn btn-icon workspace-toolbar-btn${open ? " on" : ""}`}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Más acciones"
        title="Más acciones"
      >
        <ToolbarIcon name="more" />
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={panelRef}
              className="workspace-toolbar-menu__panel workspace-toolbar-menu__panel--floating"
              style={{ top: pos.top, left: pos.left }}
              role="menu"
            >
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={[
                    "workspace-toolbar-menu__item",
                    item.checked && "workspace-toolbar-menu__item--checked",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  role="menuitemcheckbox"
                  aria-checked={item.checked ?? false}
                  onClick={item.onClick}
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
