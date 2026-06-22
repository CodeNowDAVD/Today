import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import {
  AppNotification,
  formatDateCompact,
  isSessionExpired,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationUnreadCount,
} from "./api";
import { subscribeNotificationStream } from "./notificationStream";
import type { LifeNavTarget } from "./lifeNav";
import type { SpaceworkNavTarget } from "./spaceworkNav";

type Props = {
  onNavigate: (target: SpaceworkNavTarget) => void;
  onSelectSpacework: () => void;
  onSelectLife?: () => void;
  onLifeNavigate?: (target: LifeNavTarget) => void;
  onOpenInvitations?: () => void;
  onSessionLost: () => void;
  placement?: "default" | "sidebar";
  collapsed?: boolean;
};

export default function NotificationBell({
  onNavigate,
  onSelectSpacework,
  onSelectLife,
  onLifeNavigate,
  onOpenInvitations,
  onSessionLost,
  placement = "default",
  collapsed = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const [countRes, list] = await Promise.all([
        notificationUnreadCount(),
        listNotifications(),
      ]);
      setUnread(countRes.count);
      setItems(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      if (isSessionExpired(msg)) onSessionLost();
    }
  }, [onSessionLost]);

  useEffect(() => {
    void refresh();
    const stop = subscribeNotificationStream(
      (notification, count) => {
        setUnread(count);
        setItems((prev) => [notification, ...prev.filter((n) => n.id !== notification.id)]);
      },
      (msg) => {
        if (isSessionExpired(msg)) onSessionLost();
      },
    );
    return () => {
      stop();
    };
  }, [refresh, onSessionLost]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void refresh().finally(() => setLoading(false));
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleOpenItem(n: AppNotification) {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setItems((prev) => prev.map((row) => (row.id === n.id ? { ...row, read: true } : row)));
        setUnread((c) => Math.max(0, c - 1));
      } catch {
        // continue navigation
      }
    }
    setOpen(false);
    if (n.kind === "PROJECT_INVITATION") {
      onOpenInvitations?.();
      return;
    }
    if (
      n.targetTab === "life" ||
      n.kind === "TASK_DUE_SOON" ||
      n.kind === "TASK_OVERDUE"
    ) {
      onSelectLife?.();
      onLifeNavigate?.({
        view: "tasks",
        workspaceId: n.projectId,
        taskId: n.entityId ?? undefined,
      });
      return;
    }
    onSelectSpacework();
    const tab = (n.targetTab as SpaceworkNavTarget["tab"]) || "items";
    onNavigate({
      projectId: n.projectId,
      tab,
      fileId: n.kind === "FILE_COMMENT" && n.entityId != null ? n.entityId : undefined,
    });
  }

  async function handleMarkAll() {
    try {
      const res = await markAllNotificationsRead();
      setUnread(res.count);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      if (isSessionExpired(msg)) onSessionLost();
    }
  }

  return (
    <div
      className={[
        "notification-bell",
        placement === "sidebar" && "notification-bell--sidebar",
        placement === "sidebar" && collapsed && "notification-bell--collapsed",
      ]
        .filter(Boolean)
        .join(" ")}
      ref={panelRef}
    >
      <button
        type="button"
        className={["notification-bell__btn", open && "on"].filter(Boolean).join(" ")}
        aria-label={unread > 0 ? `${unread} notificaciones sin leer` : "Notificaciones"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={20} strokeWidth={1.75} aria-hidden />
        {unread > 0 ? (
          <span className="notification-bell__badge">{unread > 99 ? "99+" : unread}</span>
        ) : null}
      </button>

      {open && (
        <div className="notification-bell__panel" role="dialog" aria-label="Notificaciones">
          <header className="notification-bell__head">
            <h2>Notificaciones</h2>
            {unread > 0 && (
              <button type="button" className="btn ghost sm" onClick={() => void handleMarkAll()}>
                Marcar todas
              </button>
            )}
          </header>
          <ul className="notification-bell__list">
            {loading && items.length === 0 ? (
              <li className="notification-bell__empty muted">Cargando…</li>
            ) : items.length === 0 ? (
              <li className="notification-bell__empty muted">Sin notificaciones</li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={[
                      "notification-bell__item",
                      !n.read && "notification-bell__item--unread",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => void handleOpenItem(n)}
                  >
                    <span className="notification-bell__item-title">{n.title}</span>
                    {n.body ? (
                      <span className="notification-bell__item-body muted">{n.body}</span>
                    ) : null}
                    <span className="notification-bell__item-meta muted">
                      {n.projectName} · {formatDateCompact(n.createdAt)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
