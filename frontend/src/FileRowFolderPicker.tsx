import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FileItem, FolderItem } from "./api";
import { LOOSE_FOLDER_LABEL } from "./folderUi";
import { TableFolderIcon } from "./SidebarIcons";

type Props = {
  file: FileItem;
  folders: FolderItem[];
  onMove: (folderId: number | null) => void;
};

type MenuPos = { top: number; left: number; minWidth: number; maxWidth: number };

export default function FileRowFolderPicker({ file, folders, onMove }: Props) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const updateMenuPos = useCallback(() => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const minWidth = 10.5 * 16;
    const maxWidth = 14 * 16;
    let left = rect.left;
    if (left + maxWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - maxWidth - 8);
    }
    setMenuPos({
      top: rect.bottom + 4,
      left,
      minWidth,
      maxWidth,
    });
  }, []);

  const folderLabel =
    file.folderId == null
      ? LOOSE_FOLDER_LABEL
      : folders.find((f) => f.id === file.folderId)?.name ?? "Carpeta";

  const isLoose = file.folderId == null;

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updateMenuPos();
  }, [open, updateMenuPos, folderLabel]);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onReflow() {
      updateMenuPos();
    }
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, updateMenuPos]);

  const menu =
    open && menuPos
      ? createPortal(
          <ul
            ref={menuRef}
            className="file-action-menu file-folder-picker-menu file-folder-picker-menu--portal"
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              minWidth: menuPos.minWidth,
              maxWidth: menuPos.maxWidth,
              width: "max-content",
            }}
            role="menu"
          >
            <li>
              <button
                type="button"
                role="menuitem"
                className={file.folderId == null ? "on" : ""}
                onClick={() => {
                  onMove(null);
                  setOpen(false);
                }}
              >
                {LOOSE_FOLDER_LABEL}
              </button>
            </li>
            {folders.map((fo) => (
              <li key={fo.id}>
                <button
                  type="button"
                  role="menuitem"
                  className={file.folderId === fo.id ? "on" : ""}
                  onClick={() => {
                    onMove(fo.id);
                    setOpen(false);
                  }}
                >
                  {fo.name}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className="file-folder-picker" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={`file-folder-picker-btn row-pill-text ${isLoose ? "file-folder-picker-btn--loose" : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        title={`Cambiar proyecto · actual: ${folderLabel}`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <span className="col-folder-icon" aria-hidden>
          <TableFolderIcon />
        </span>
        <span className="file-folder-picker-label">{folderLabel}</span>
        <span className="file-folder-picker-caret" aria-hidden>
          ▾
        </span>
      </button>
      {menu}
    </div>
  );
}
