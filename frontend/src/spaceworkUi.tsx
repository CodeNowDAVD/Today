import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  FileStack,
  FolderKanban,
  MessageCircle,
  MonitorPlay,
  ScrollText,
  Users,
} from "lucide-react";
import type { ProjectRole } from "./api";

export type SpaceworkTabId =
  | "items"
  | "tasks"
  | "wiki"
  | "presentation"
  | "chat"
  | "members"
  | "activity";

export const SPACEWORK_TABS: { id: SpaceworkTabId; label: string; icon: LucideIcon }[] = [
  { id: "items", label: "Archivos", icon: FileStack },
  { id: "tasks", label: "Tareas", icon: FolderKanban },
  { id: "wiki", label: "Wiki", icon: ScrollText },
  { id: "presentation", label: "Presentación", icon: MonitorPlay },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "members", label: "Miembros", icon: Users },
  { id: "activity", label: "Actividad", icon: Activity },
];

export const ROLE_LABELS: Record<ProjectRole, string> = {
  OWNER: "Dueño",
  ADMIN: "Admin",
  MEMBER: "Miembro",
  VIEWER: "Solo lectura",
};

export function projectAccentStyle(projectId: number): CSSProperties {
  const hue = (projectId * 53) % 360;
  return {
    "--sw-hue": String(hue),
  } as CSSProperties;
}

export function userHue(username: string): number {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

export function userInitials(username: string): string {
  const parts = username.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

type AvatarProps = {
  name: string;
  size?: "sm" | "md" | "lg";
};

export function SpaceworkAvatar({ name, size = "md" }: AvatarProps) {
  const hue = userHue(name);
  return (
    <span
      className={`spacework-avatar spacework-avatar--${size}`}
      style={{ background: `hsl(${hue} 42% 40%)` }}
      aria-hidden
    >
      {userInitials(name)}
    </span>
  );
}

export function SpaceworkRoleBadge({ role }: { role: ProjectRole }) {
  return (
    <span className={`spacework-role spacework-role--${role.toLowerCase()}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

export function SpaceworkLiveBadge() {
  return <span className="spacework-live">en vivo</span>;
}

type EmptyProps = {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children?: ReactNode;
};

export function SpaceworkEmpty({ icon: Icon, title, hint, children }: EmptyProps) {
  return (
    <div className="spacework-empty-state">
      <div className="spacework-empty-state__icon" aria-hidden>
        <Icon size={26} strokeWidth={1.6} />
      </div>
      <p className="spacework-empty-state__title">{title}</p>
      {hint ? <p className="spacework-empty-state__hint">{hint}</p> : null}
      {children ? <div className="spacework-empty-state__actions">{children}</div> : null}
    </div>
  );
}

export function SpaceworkSection({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={["spacework-section", className].filter(Boolean).join(" ")}>{children}</div>
  );
}

export function SpaceworkLoading({ label }: { label: string }) {
  return (
    <div className="spacework-loading" role="status">
      <span className="spacework-loading__dot" />
      <span className="spacework-loading__dot" />
      <span className="spacework-loading__dot" />
      <span className="spacework-loading__label">{label}</span>
    </div>
  );
}
