import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Inbox,
  Link2,
  Orbit,
  Search,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";

const navIcon = {
  size: 17,
  strokeWidth: 1.75,
  "aria-hidden": true as const,
};

export function SidebarBrandIcon({ compact = false }: { compact?: boolean }) {
  if (compact) return <Cloud {...navIcon} />;
  return <Cloud size={21} strokeWidth={2.25} aria-hidden />;
}

/** Biblioteca principal — carpeta abierta (no «copiar»). */
export function SidebarFilesIcon() {
  return <FolderOpen {...navIcon} />;
}

export function SidebarLinksIcon() {
  return <Link2 {...navIcon} />;
}

export function SidebarSpaceworkIcon() {
  return <Orbit {...navIcon} />;
}

export function SidebarLifeIcon() {
  return <Sparkles {...navIcon} />;
}

export function SidebarUsersIcon() {
  return <Users {...navIcon} />;
}

export function SidebarTrashIcon() {
  return <Trash2 {...navIcon} />;
}

export function SidebarChevronIcon() {
  return <ChevronDown size={16} strokeWidth={2} aria-hidden />;
}

export function SidebarCollapseExpandIcon() {
  return <ChevronRight size={15} strokeWidth={2.25} aria-hidden />;
}

export function SidebarCollapseRetractIcon() {
  return <ChevronLeft size={15} strokeWidth={2.25} aria-hidden />;
}

export function TableFolderIcon() {
  return <Folder size={16} strokeWidth={2.25} aria-hidden />;
}

export function SidebarFolderIcon() {
  return <Folder {...navIcon} />;
}

export function SidebarFolderPlusIcon() {
  return <FolderPlus {...navIcon} />;
}

export function SidebarInboxIcon() {
  return <Inbox {...navIcon} />;
}

export function SidebarSearchIcon() {
  return <Search size={15} strokeWidth={2} aria-hidden />;
}

export function FileMoveHintIcon() {
  return <FolderInput size={14} strokeWidth={2} aria-hidden />;
}
