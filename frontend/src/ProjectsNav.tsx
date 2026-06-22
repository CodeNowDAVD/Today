import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  SidebarFolderIcon,
  SidebarFolderPlusIcon,
  SidebarInboxIcon,
} from "./SidebarIcons";
import type { FolderItem } from "./api";
import ConfirmDialog from "./ConfirmDialog";
import CreateFolderDialog from "./CreateFolderDialog";
import { isFileDrag, isOsFileDrop, mayAcceptOsFileDrop, readDraggedFileIds, filesFromDataTransfer, toFileList } from "./fileDrag";
import { isLinkDrag, readDraggedLinkId } from "./linkDrag";
import { folderInitial, normalizeSearchText } from "./folderUi";
import { RailHintTarget } from "./RailHint";
import SidebarFolderSearch from "./SidebarFolderSearch";

export type FolderFilter = "all" | "none" | number;

type ContextMenuState = {
  x: number;
  y: number;
  folder: FolderItem;
};

type Props = {
  folders: FolderItem[];
  filter: FolderFilter;
  expanded: boolean;
  collapsed?: boolean;
  loading: boolean;
  onToggleExpanded: () => void;
  onSelect: (f: FolderFilter) => void;
  onCreate: (name: string) => void | Promise<void>;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number, name: string) => void;
  acceptLinkDrop?: boolean;
  linkDropTargetFolderId?: number | null | undefined;
  onLinkDragOverFolder?: (folderId: number | null | undefined) => void;
  onLinkDropOnFolder?: (folderId: number | null, linkId: number) => void;
  acceptFileDrop?: boolean;
  fileDropTargetFolderId?: number | null | undefined;
  onFileDragOverFolder?: (folderId: number | null | undefined) => void;
  onFileDropOnFolder?: (folderId: number | null, fileIds: number | number[]) => void;
  acceptOsFileDrop?: boolean;
  osUploadHoverFolder?: number | null | undefined;
  onOsFileDragOverFolder?: (folderId: number | null | undefined) => void;
  onOsFileDropOnFolder?: (folderId: number | null, files: FileList) => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  showSearch?: boolean;
};

function activeFolderLabel(filter: FolderFilter, folders: FolderItem[]): string | null {
  if (filter === "all" || filter === "none") return null;
  return folders.find((f) => f.id === filter)?.name ?? null;
}

export default function ProjectsNav({
  folders,
  filter,
  expanded,
  collapsed = false,
  loading,
  onToggleExpanded,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  acceptLinkDrop = false,
  linkDropTargetFolderId = undefined,
  onLinkDragOverFolder,
  onLinkDropOnFolder,
  acceptFileDrop = false,
  fileDropTargetFolderId = undefined,
  onFileDragOverFolder,
  onFileDropOnFolder,
  acceptOsFileDrop = false,
  osUploadHoverFolder,
  onOsFileDragOverFolder,
  onOsFileDropOnFolder,
  searchQuery = "",
  onSearchQueryChange,
  showSearch = false,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderItem | null>(null);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const folderRowRefs = useRef(new Map<number, HTMLLIElement>());
  const flyoutTriggerRef = useRef<HTMLButtonElement>(null);
  const flyoutRef = useRef<HTMLElement>(null);

  const selectedFolderName = activeFolderLabel(filter, folders);
  const folderFilterActive = filter !== "all" && filter !== "none";

  const filteredFolders = useMemo(() => {
    const q = normalizeSearchText(searchQuery.trim());
    if (!q) return folders;
    return folders.filter((f) => normalizeSearchText(f.name).includes(q));
  }, [folders, searchQuery]);

  const folderSearchField = showSearch ? (
    <SidebarFolderSearch
      value={searchQuery}
      onChange={(q) => onSearchQueryChange?.(q)}
      className="sidebar-folder-search-wrap--flyout"
    />
  ) : null;

  useEffect(() => {
    if (typeof filter !== "number") return;
    const row = folderRowRefs.current.get(filter);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [filter, folders]);

  useEffect(() => {
    if (!collapsed) setFlyoutOpen(false);
  }, [collapsed]);

  useLayoutEffect(() => {
    if (!flyoutOpen || !collapsed || !flyoutTriggerRef.current) {
      setFlyoutPos(null);
      return;
    }
    const rect = flyoutTriggerRef.current.getBoundingClientRect();
    const maxTop = 12;
    const preferredTop = rect.top - 8;
    setFlyoutPos({
      top: Math.max(maxTop, Math.min(preferredTop, window.innerHeight - 320)),
      left: rect.right + 10,
    });
  }, [flyoutOpen, collapsed, folders.length]);

  useEffect(() => {
    if (!flyoutOpen) return;
    function close(e: MouseEvent) {
      const target = e.target as Node;
      if (flyoutTriggerRef.current?.contains(target)) return;
      if (flyoutRef.current?.contains(target)) return;
      setFlyoutOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFlyoutOpen(false);
    }
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [flyoutOpen]);

  useEffect(() => {
    if (!menu) return;
    function close() {
      setMenu(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  useEffect(() => {
    if (renamingId != null) renameRef.current?.focus();
  }, [renamingId]);

  useEffect(() => {
    if (searchQuery.trim() && !expanded) onToggleExpanded();
  }, [searchQuery, expanded, onToggleExpanded]);

  function openContextMenu(e: React.MouseEvent, folder: FolderItem) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, folder });
  }

  function startRename(folder: FolderItem) {
    setMenu(null);
    setRenamingId(folder.id);
    setRenameDraft(folder.name);
  }

  function commitRename(folderId: number) {
    const name = renameDraft.trim();
    setRenamingId(null);
    if (!name) return;
    const current = folders.find((f) => f.id === folderId);
    if (current && current.name !== name) onRename(folderId, name);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameDraft("");
  }

  function requestDelete(folder: FolderItem) {
    setMenu(null);
    setFolderToDelete(folder);
  }

  function confirmDeleteFolder() {
    if (!folderToDelete) return;
    onDelete(folderToDelete.id, folderToDelete.name);
    setFolderToDelete(null);
  }

  function osUploadHighlight(folderId: number | null) {
    return acceptOsFileDrop && osUploadHoverFolder === folderId;
  }

  function isDropTarget(folderId: number | null, active: number | null | undefined) {
    return active !== undefined && active === folderId;
  }

  function projectDropHandlers(folderId: number | null) {
    if (!acceptOsFileDrop && !acceptLinkDrop && !acceptFileDrop) return {};
    return {
      onDragOver: (e: DragEvent) => {
        const dt = e.dataTransfer;
        const link = acceptLinkDrop && isLinkDrag(dt);
        const file = acceptFileDrop && isFileDrag(dt);
        const os = acceptOsFileDrop && (isOsFileDrop(dt) || mayAcceptOsFileDrop(dt));
        if (!link && !file && !os) return;
        e.preventDefault();
        e.stopPropagation();
        dt.dropEffect = os ? "copy" : "move";
        if (link) onLinkDragOverFolder?.(folderId);
        if (file) onFileDragOverFolder?.(folderId);
        if (os) onOsFileDragOverFolder?.(folderId);
      },
      onDragLeave: () => {
        onLinkDragOverFolder?.(undefined);
        onFileDragOverFolder?.(undefined);
        onOsFileDragOverFolder?.(undefined);
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const dt = e.dataTransfer;
        if (acceptOsFileDrop && (isOsFileDrop(dt) || mayAcceptOsFileDrop(dt)) && onOsFileDropOnFolder) {
          const picked = filesFromDataTransfer(dt);
          if (picked.length) {
            onOsFileDropOnFolder(folderId, toFileList(picked));
          }
          return;
        }
        if (acceptLinkDrop && isLinkDrag(dt)) {
          const linkId = readDraggedLinkId(dt);
          if (linkId != null) onLinkDropOnFolder?.(folderId, linkId);
          return;
        }
        if (acceptFileDrop && isFileDrag(dt)) {
          const fileIds = readDraggedFileIds(dt);
          if (fileIds.length > 0) onFileDropOnFolder?.(folderId, fileIds);
        }
      },
    };
  }

  function handleSelect(f: FolderFilter) {
    onSelect(f);
    if (collapsed) setFlyoutOpen(false);
  }

  const pinnedList = (
    <ul className="projects-list projects-list--pinned">
      <li className="project-create-wrap">
        <button type="button" className="project-item new-folder" onClick={() => setCreateOpen(true)}>
          <span className="project-item-icon project-item-icon--gold" aria-hidden>
            <SidebarFolderPlusIcon />
          </span>
          <span className="project-name">Nueva carpeta</span>
        </button>
      </li>

      <li>
        <button
          type="button"
          className={`project-item project-item--inbox ${filter === "all" ? "on" : ""} ${
            osUploadHighlight(null) ||
            isDropTarget(null, linkDropTargetFolderId) ||
            isDropTarget(null, fileDropTargetFolderId)
              ? "project-item--drop-hint"
              : ""
          }`}
          onClick={() => handleSelect("all")}
          {...projectDropHandlers(null)}
        >
          <span className="project-item-icon" aria-hidden>
            <SidebarInboxIcon />
          </span>
          <span className="project-name">Todos los archivos</span>
        </button>
      </li>
    </ul>
  );

  const folderList = (
    <div
      className={["projects-folder-list", !expanded && "projects-folder-list--collapsed"].filter(Boolean).join(" ")}
      hidden={!expanded}
    >
      <ul className="projects-list projects-list--folders">
        {folders.length > 0 && <li className="projects-divider" aria-hidden />}

        {loading && folders.length === 0 && <li className="projects-muted">Cargando…</li>}
        {!loading && folders.length === 0 && (
          <li className="projects-muted">Sin carpetas. Usa «Nueva carpeta» arriba.</li>
        )}
        {!loading && folders.length > 0 && searchQuery.trim() && filteredFolders.length === 0 && (
          <li className="projects-muted">Sin coincidencias.</li>
        )}
        {filteredFolders.map((f) => (
          <li
            key={f.id}
            className="project-row"
            ref={(el) => {
              if (el) folderRowRefs.current.set(f.id, el);
              else folderRowRefs.current.delete(f.id);
            }}
            onContextMenu={(e) => openContextMenu(e, f)}
          >
            {renamingId === f.id ? (
              <form
                className="project-inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  commitRename(f.id);
                }}
              >
                <input
                  ref={renameRef}
                  className="project-inline-input"
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelRename();
                    }
                  }}
                  onBlur={() => commitRename(f.id)}
                  maxLength={120}
                  aria-label="Nuevo nombre"
                />
              </form>
            ) : (
              <button
                type="button"
                className={`project-item ${filter === f.id ? "on" : ""} ${
                  osUploadHighlight(f.id) ||
                  isDropTarget(f.id, linkDropTargetFolderId) ||
                  isDropTarget(f.id, fileDropTargetFolderId)
                    ? "project-item--drop-hint"
                    : ""
                }`}
                onClick={() => handleSelect(f.id)}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  startRename(f);
                }}
                {...projectDropHandlers(f.id)}
              >
                <span className="project-initial" aria-hidden>
                  {folderInitial(f.name)}
                </span>
                <span className="project-item-icon" aria-hidden>
                  <SidebarFolderIcon />
                </span>
                <span className="project-name">{f.name}</span>
                {f.fileCount > 0 && (
                  <span className="project-file-count" aria-label={`${f.fileCount} archivos`}>
                    {f.fileCount}
                  </span>
                )}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  const projectsList = (
    <>
      {pinnedList}
      {folderList}
    </>
  );

  const dialogs: ReactNode = (
    <>
      {menu && (
        <>
          <button
            type="button"
            className="folder-context-backdrop"
            aria-label="Cerrar menú"
            onClick={() => setMenu(null)}
          />
          <div className="folder-context-menu" style={{ left: menu.x, top: menu.y }} role="menu">
            <button type="button" role="menuitem" onClick={() => startRename(menu.folder)}>
              Renombrar
            </button>
            <button type="button" role="menuitem" className="danger" onClick={() => requestDelete(menu.folder)}>
              Eliminar carpeta…
            </button>
          </div>
        </>
      )}

      <CreateFolderDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={onCreate}
      />

      <ConfirmDialog
        open={folderToDelete != null}
        title="¿Eliminar carpeta?"
        message={
          folderToDelete
            ? `Vas a eliminar «${folderToDelete.name}». Los archivos y enlaces no se borran: quedan sueltos (sin carpeta). Esta acción no se puede deshacer.`
            : ""
        }
        cancelLabel="Cancelar"
        confirmLabel="Sí, eliminar carpeta"
        onCancel={() => setFolderToDelete(null)}
        onConfirm={confirmDeleteFolder}
      />
    </>
  );

  if (collapsed) {
    const flyout =
      flyoutOpen && flyoutPos
        ? createPortal(
            <>
              <button
                type="button"
                className="sidebar-folders-flyout-backdrop"
                aria-label="Cerrar carpetas"
                onClick={() => setFlyoutOpen(false)}
              />
              <aside
                ref={flyoutRef}
                className="sidebar-folders-flyout"
                style={{ top: flyoutPos.top, left: flyoutPos.left }}
                role="dialog"
                aria-label="Carpetas"
              >
                <header className="sidebar-folders-flyout__head">
                  <div className="sidebar-folders-flyout__titles">
                    <h2 className="sidebar-folders-flyout__title">Carpetas</h2>
                    {selectedFolderName ? (
                      <p className="sidebar-folders-flyout__active" title={selectedFolderName}>
                        {selectedFolderName}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="sidebar-folders-flyout__close"
                    onClick={() => setFlyoutOpen(false)}
                    aria-label="Cerrar"
                  >
                    ×
                  </button>
                </header>
                {folderSearchField}
                <div className="sidebar-folders-flyout__body">
                  <div className="projects-nav-body">{projectsList}</div>
                </div>
              </aside>
            </>,
            document.body,
          )
        : null;

    const folderHint =
      selectedFolderName != null ? `Carpetas · ${selectedFolderName}` : "Carpetas";

    return (
      <>
        <RailHintTarget label={folderHint} enabled>
          <button
            ref={flyoutTriggerRef}
            type="button"
            className={[
              "sidebar-rail-btn",
              (flyoutOpen || folderFilterActive) && "on",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setFlyoutOpen((open) => !open)}
            aria-expanded={flyoutOpen}
            aria-haspopup="dialog"
            aria-label={folderHint}
          >
            <span className="sidebar-rail-btn__icon" aria-hidden>
              <SidebarFolderIcon />
            </span>
            {folderFilterActive ? <span className="sidebar-rail-btn__dot" aria-hidden /> : null}
          </button>
        </RailHintTarget>
        {flyout}
        {dialogs}
      </>
    );
  }

  return (
    <section className="projects-nav" aria-label="Carpetas">
      <div className="projects-head">
        <span className="projects-head-label">Proyectos</span>
      </div>
      <div className="projects-nav-body">
        {projectsList}
      </div>
      {dialogs}
    </section>
  );
}
