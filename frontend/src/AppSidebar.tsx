import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ProjectsNav, { type FolderFilter } from "./ProjectsNav";
import SidebarFolderSearch from "./SidebarFolderSearch";
import { RailHintProvider, RailHintTarget, RailHintCollapseSync } from "./RailHint";
import ThemePicker from "./ThemePicker";
import NotificationBell from "./NotificationBell";
import type { FileItem, FolderItem } from "./api";
import type { MainView } from "./appTypes";
import type { SpaceworkNavTarget } from "./spaceworkNav";
import type { LifeNavTarget } from "./lifeNav";
import {
  SidebarBrandIcon,
  SidebarChevronIcon,
  SidebarCollapseRetractIcon,
  SidebarFilesIcon,
  SidebarLifeIcon,
  SidebarLinksIcon,
  SidebarSpaceworkIcon,
  SidebarTrashIcon,
  SidebarUsersIcon,
} from "./SidebarIcons";

type Props = {
  mainView: MainView;
  isAdmin: boolean;
  sessionUsername: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onLogout: () => void;
  activeCount?: number;
  trashCount?: number;
  folders: FolderItem[];
  folderFilter: FolderFilter;
  projectsExpanded: boolean;
  foldersLoading: boolean;
  linkDropTargetFolderId: number | null | undefined;
  fileDropTargetFolderId: number | null | undefined;
  fileDragging?: boolean;
  osUploadHoverFolder: number | null | undefined;
  onSelectView: (view: MainView) => void;
  onFolderFilter: (f: FolderFilter) => void;
  onToggleProjectsExpanded: () => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: number, name: string) => void;
  onDeleteFolder: (id: number) => void;
  onLinkDragOverFolder: (folderId: number | null | undefined) => void;
  onLinkDropOnFolder: (folderId: number | null, linkId: number) => void;
  onFileDragOverFolder: (folderId: number | null | undefined) => void;
  onFileDropOnFolder: (folderId: number | null, fileIds: number | number[]) => void;
  onOsFileDragOverFolder: (folderId: number | null | undefined) => void;
  onOsFileDropOnFolder: (folderId: number | null, files: FileList) => void;
  onSelectSpacework: () => void;
  onSpaceworkNavigate: (target: SpaceworkNavTarget) => void;
  onSelectLife: () => void;
  onLifeNavigate: (target: LifeNavTarget) => void;
  onQuickCapture: () => void;
  inboxPendingCount?: number;
  onSessionLost: () => void;
  onOpenInvitations?: () => void;
};

function userInitials(username: string): string {
  const trimmed = username.trim();
  if (!trimmed) return "?";
  if (trimmed.length >= 2) return trimmed.slice(0, 2).toUpperCase();
  return trimmed.toUpperCase();
}

export default function AppSidebar({
  mainView,
  isAdmin,
  sessionUsername,
  collapsed,
  onToggleCollapsed,
  onLogout,
  activeCount,
  trashCount,
  folders,
  folderFilter,
  projectsExpanded,
  foldersLoading,
  linkDropTargetFolderId,
  fileDropTargetFolderId,
  fileDragging = false,
  osUploadHoverFolder,
  onSelectView,
  onFolderFilter,
  onToggleProjectsExpanded,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onLinkDragOverFolder,
  onLinkDropOnFolder,
  onFileDragOverFolder,
  onFileDropOnFolder,
  onOsFileDragOverFolder,
  onOsFileDropOnFolder,
  onSelectSpacework,
  onSpaceworkNavigate,
  onSelectLife,
  onLifeNavigate,
  onQuickCapture,
  inboxPendingCount,
  onSessionLost,
  onOpenInvitations,
}: Props) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [folderSearchQuery, setFolderSearchQuery] = useState("");
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuFloatingRef = useRef<HTMLDivElement>(null);
  const userTriggerRef = useRef<HTMLButtonElement>(null);
  const [userMenuPos, setUserMenuPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!userMenuOpen || !collapsed || !userTriggerRef.current) {
      setUserMenuPos(null);
      return;
    }
    function place() {
      const trigger = userTriggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuH = userMenuFloatingRef.current?.offsetHeight ?? 148;
      const menuW = userMenuFloatingRef.current?.offsetWidth ?? 156;
      let top = rect.top - menuH - 8;
      if (top < 8) top = rect.bottom + 8;
      top = Math.max(8, Math.min(top, window.innerHeight - menuH - 8));
      const left = Math.max(8, Math.min(rect.right + 10, window.innerWidth - menuW - 8));
      setUserMenuPos({ top, left });
    }
    place();
    const frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [userMenuOpen, collapsed]);

  useEffect(() => {
    if (!userMenuOpen) return;
    function close(e: MouseEvent) {
      const target = e.target as Node;
      if (userMenuRef.current?.contains(target)) return;
      if (userMenuFloatingRef.current?.contains(target)) return;
      setUserMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setUserMenuOpen(false);
    }
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [userMenuOpen]);

  const showFolderNav =
    mainView !== "users" && mainView !== "spacework" && mainView !== "life";

  const userMenuPanel =
    userMenuOpen && (!collapsed || userMenuPos) ? (
    <div
      ref={collapsed ? userMenuFloatingRef : undefined}
      className={[
        "sidebar-user-menu",
        collapsed && "sidebar-user-menu--floating",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        collapsed && userMenuPos
          ? { top: userMenuPos.top, left: userMenuPos.left }
          : undefined
      }
      role="menu"
    >
      <ThemePicker compact={collapsed} />
      <button
        type="button"
        role="menuitem"
        className="sidebar-user-menu-item"
        onClick={() => {
          setUserMenuOpen(false);
          onSelectView("api");
        }}
      >
        Tokens de API
      </button>
      <button
        type="button"
        role="menuitem"
        className="sidebar-user-menu-item"
        onClick={() => {
          setUserMenuOpen(false);
          onLogout();
        }}
      >
        Cerrar sesión
      </button>
    </div>
  ) : null;

  return (
    <RailHintProvider>
    <RailHintCollapseSync collapsed={collapsed} />
    <aside
      className={["sidebar", collapsed && "sidebar--collapsed", fileDragging && "sidebar--file-drag"]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="sidebar-brand">
        {collapsed ? (
          <RailHintTarget label="Expandir barra lateral" enabled>
            <button
              type="button"
              className="sidebar-rail-btn sidebar-rail-btn--brand"
              onClick={onToggleCollapsed}
              aria-label="Expandir barra lateral"
            >
              <span className="sidebar-rail-btn__icon" aria-hidden>
                <SidebarBrandIcon compact />
              </span>
            </button>
          </RailHintTarget>
        ) : (
          <div className="sidebar-brand-row">
            <span className="sidebar-brand-icon">
              <SidebarBrandIcon />
            </span>
            <span className="sidebar-brand-name">SOrbitS</span>
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={onToggleCollapsed}
              aria-label="Contraer barra lateral"
              title="Contraer"
            >
              <SidebarCollapseRetractIcon />
            </button>
          </div>
        )}
      </div>

      {!collapsed && showFolderNav && (
        <SidebarFolderSearch value={folderSearchQuery} onChange={setFolderSearchQuery} />
      )}

      <div className="sidebar-scroll">
        <section className="sidebar-section" aria-label="Biblioteca">
          <p className="sidebar-section-label">Biblioteca</p>
          <nav className="sidebar-nav">
            <RailHintTarget
              label={
                activeCount != null && activeCount > 0
                  ? `Mis archivos · ${activeCount}`
                  : "Mis archivos"
              }
              enabled={collapsed}
            >
            <button
              type="button"
              className={`nav-item ${mainView === "active" ? "on" : ""}`}
              onClick={() => onSelectView("active")}
              aria-label={
                activeCount != null && activeCount > 0
                  ? `Mis archivos, ${activeCount} archivos`
                  : "Mis archivos"
              }
            >
              <span className="nav-item-icon">
                <SidebarFilesIcon />
              </span>
              <span className="nav-label">Mis archivos</span>
              <span className="nav-badge-slot" aria-hidden={!activeCount}>
                {activeCount != null && activeCount > 0 ? (
                  <span className="nav-badge">{activeCount}</span>
                ) : null}
              </span>
            </button>
            </RailHintTarget>
            <RailHintTarget label="Enlaces" enabled={collapsed}>
            <button
              type="button"
              className={`nav-item ${mainView === "links" ? "on" : ""}`}
              onClick={() => onSelectView("links")}
              aria-label="Enlaces"
            >
              <span className="nav-item-icon">
                <SidebarLinksIcon />
              </span>
              <span className="nav-label">Enlaces</span>
              <span className="nav-badge-slot" aria-hidden />
            </button>
            </RailHintTarget>
            <RailHintTarget
              label={
                trashCount != null && trashCount > 0
                  ? `Papelera · ${trashCount}`
                  : "Papelera"
              }
              enabled={collapsed}
            >
            <button
              type="button"
              className={`nav-item nav-item--trash ${mainView === "trash" ? "on" : ""}`}
              onClick={() => onSelectView("trash")}
              aria-label={
                trashCount != null && trashCount > 0
                  ? `Papelera, ${trashCount} archivos`
                  : "Papelera"
              }
            >
              <span className="nav-item-icon">
                <SidebarTrashIcon />
              </span>
              <span className="nav-label">Papelera</span>
              <span className="nav-badge-slot" aria-hidden={!trashCount}>
                {trashCount != null && trashCount > 0 ? (
                  <span className="nav-badge nav-badge--muted">{trashCount}</span>
                ) : null}
              </span>
            </button>
            </RailHintTarget>
          </nav>
        </section>

        <section className="sidebar-section" aria-label="Vida">
          <p className="sidebar-section-label">Vida</p>
          <nav className="sidebar-nav">
            <RailHintTarget
              label={
                inboxPendingCount != null && inboxPendingCount > 0
                  ? `Hoy · ${inboxPendingCount} en bandeja`
                  : "Hoy"
              }
              enabled={collapsed}
            >
            <button
              type="button"
              className={`nav-item ${mainView === "life" ? "on" : ""}`}
              onClick={() => onSelectLife()}
              aria-label={
                inboxPendingCount != null && inboxPendingCount > 0
                  ? `Vida, ${inboxPendingCount} capturas pendientes`
                  : "Vida"
              }
            >
              <span className="nav-item-icon">
                <SidebarLifeIcon />
              </span>
              <span className="nav-label">Hoy</span>
              <span className="nav-badge-slot" aria-hidden={!inboxPendingCount}>
                {inboxPendingCount != null && inboxPendingCount > 0 ? (
                  <span className="nav-badge">{inboxPendingCount}</span>
                ) : null}
              </span>
            </button>
            </RailHintTarget>
          </nav>
        </section>

        <section className="sidebar-section" aria-label="Spacework">
          <p className="sidebar-section-label">Spacework</p>
          <nav className="sidebar-nav">
            <RailHintTarget label="Spacework" enabled={collapsed}>
            <button
              type="button"
              className={`nav-item ${mainView === "spacework" ? "on" : ""}`}
              onClick={() => onSelectView("spacework")}
              aria-label="Spacework"
            >
              <span className="nav-item-icon">
                <SidebarSpaceworkIcon />
              </span>
              <span className="nav-label">Spacework</span>
              <span className="nav-badge-slot" aria-hidden />
            </button>
            </RailHintTarget>
          </nav>
        </section>

        {isAdmin && (
          <section className="sidebar-section" aria-label="Administración">
            <p className="sidebar-section-label">Administración</p>
            <nav className="sidebar-nav">
              <RailHintTarget label="Usuarios" enabled={collapsed}>
              <button
                type="button"
                className={`nav-item ${mainView === "users" ? "on" : ""}`}
                onClick={() => onSelectView("users")}
                aria-label="Usuarios"
              >
                <span className="nav-item-icon">
                  <SidebarUsersIcon />
                </span>
                <span className="nav-label">Usuarios</span>
                <span className="nav-badge-slot" aria-hidden />
              </button>
              </RailHintTarget>
            </nav>
          </section>
        )}

        {showFolderNav &&
          (collapsed ? (
            <>
              <div className="sidebar-rail-divider" aria-hidden />
              <div className="sidebar-rail-cell" aria-label="Carpetas">
                <ProjectsNav
                  folders={folders}
                  filter={folderFilter}
                  expanded={projectsExpanded}
                  collapsed
                  loading={foldersLoading}
                  onToggleExpanded={onToggleProjectsExpanded}
                  onSelect={(f) => {
                    onFolderFilter(f);
                    if (mainView === "trash") onSelectView("active");
                  }}
                  onCreate={onCreateFolder}
                  onRename={onRenameFolder}
                  onDelete={onDeleteFolder}
                  acceptLinkDrop={mainView === "links"}
                  linkDropTargetFolderId={linkDropTargetFolderId}
                  onLinkDragOverFolder={onLinkDragOverFolder}
                  onLinkDropOnFolder={onLinkDropOnFolder}
                  acceptFileDrop={mainView === "active"}
                  fileDropTargetFolderId={fileDropTargetFolderId}
                  onFileDragOverFolder={onFileDragOverFolder}
                  onFileDropOnFolder={onFileDropOnFolder}
                  acceptOsFileDrop={mainView === "active"}
                  osUploadHoverFolder={osUploadHoverFolder}
                  onOsFileDragOverFolder={onOsFileDragOverFolder}
                  onOsFileDropOnFolder={onOsFileDropOnFolder}
                  searchQuery={folderSearchQuery}
                  onSearchQueryChange={setFolderSearchQuery}
                  showSearch
                />
              </div>
            </>
          ) : (
            <section className="sidebar-section sidebar-section--folders" aria-label="Carpetas">
              <ProjectsNav
                folders={folders}
                filter={folderFilter}
                expanded={projectsExpanded}
                collapsed={false}
                loading={foldersLoading}
                onToggleExpanded={onToggleProjectsExpanded}
                onSelect={(f) => {
                  onFolderFilter(f);
                  if (mainView === "trash") onSelectView("active");
                }}
                onCreate={onCreateFolder}
                onRename={onRenameFolder}
                onDelete={onDeleteFolder}
                acceptLinkDrop={mainView === "links"}
                linkDropTargetFolderId={linkDropTargetFolderId}
                onLinkDragOverFolder={onLinkDragOverFolder}
                onLinkDropOnFolder={onLinkDropOnFolder}
                acceptFileDrop={mainView === "active"}
                fileDropTargetFolderId={fileDropTargetFolderId}
                onFileDragOverFolder={onFileDragOverFolder}
                onFileDropOnFolder={onFileDropOnFolder}
                acceptOsFileDrop={mainView === "active"}
                osUploadHoverFolder={osUploadHoverFolder}
                onOsFileDragOverFolder={onOsFileDragOverFolder}
                onOsFileDropOnFolder={onOsFileDropOnFolder}
                searchQuery={folderSearchQuery}
                onSearchQueryChange={setFolderSearchQuery}
              />
            </section>
          ))}
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-utilities" aria-label="Accesos rápidos">
          <div className="sidebar-life-capture-wrap">
            <RailHintTarget label="Captura rápida · ⌘⇧N" enabled={collapsed}>
              <button
                type="button"
                className="sidebar-life-capture-btn"
                onClick={onQuickCapture}
                aria-label="Captura rápida"
                title="Captura rápida (⌘⇧N)"
              >
                {collapsed ? "+" : "+ Captura rápida"}
              </button>
            </RailHintTarget>
          </div>
          <div className="sidebar-utilities-actions">
            <NotificationBell
              placement="sidebar"
              collapsed={collapsed}
              onSelectSpacework={onSelectSpacework}
              onNavigate={onSpaceworkNavigate}
              onSelectLife={onSelectLife}
              onLifeNavigate={onLifeNavigate}
              onOpenInvitations={onOpenInvitations}
              onSessionLost={onSessionLost}
            />
          </div>
        </div>
        <div className="sidebar-user-card" ref={userMenuRef}>
          {collapsed ? (
            <RailHintTarget label={`Cuenta · ${sessionUsername}`} enabled>
              <button
                ref={userTriggerRef}
                type="button"
                className={[
                  "sidebar-rail-btn",
                  "sidebar-rail-btn--user",
                  userMenuOpen && "on",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-label={`Cuenta: ${sessionUsername}`}
                onClick={() => setUserMenuOpen((open) => !open)}
              >
                <span className="sidebar-user-avatar sidebar-rail-btn__avatar" aria-hidden>
                  {userInitials(sessionUsername)}
                </span>
              </button>
            </RailHintTarget>
          ) : (
            <button
              ref={userTriggerRef}
              type="button"
              className="sidebar-user-trigger"
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              onClick={() => setUserMenuOpen((open) => !open)}
            >
              <span className="sidebar-user-avatar" aria-hidden>
                {userInitials(sessionUsername)}
              </span>
              <span className="sidebar-user-info">
                <span className="sidebar-user-name" title={sessionUsername}>
                  {sessionUsername}
                  {isAdmin && <span className="badge admin"> Admin</span>}
                </span>
              </span>
              <span className={`sidebar-user-chevron${userMenuOpen ? " is-open" : ""}`}>
                <SidebarChevronIcon />
              </span>
            </button>
          )}
          {!collapsed && userMenuPanel}
        </div>
      </div>
      {collapsed && userMenuPanel ? createPortal(userMenuPanel, document.body) : null}
    </aside>
    </RailHintProvider>
  );
}
