import { useEffect, useMemo, useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import CreateUserDialog from "./CreateUserDialog";
import ResetPasswordDialog from "./ResetPasswordDialog";
import { createUser, deleteUser, Role, updateUser, UserRow } from "./api";
import WorkspaceChrome from "./WorkspaceChrome";

type Props = {
  users: UserRow[];
  loading: boolean;
  currentUsername: string;
  onRefresh: () => void | Promise<void>;
  onError: (message: string) => void;
};

type PendingAction =
  | { kind: "role"; user: UserRow; nextRole: Role }
  | { kind: "toggleActive"; user: UserRow }
  | { kind: "delete"; user: UserRow }
  | { kind: "createAdmin"; username: string; password: string; role: Role };

function userInitial(username: string) {
  const c = username.trim().charAt(0);
  return c ? c.toUpperCase() : "?";
}

type MenuState = { user: UserRow; x: number; y: number };

export default function UsersPanel({
  users,
  loading,
  currentUsername,
  onRefresh,
  onError,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [filter, setFilter] = useState("");
  const [menu, setMenu] = useState<MenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeAdminCount = useMemo(
    () => users.filter((u) => u.role === "ADMIN" && u.active).length,
    [users],
  );

  const stats = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((u) => u.role === "ADMIN").length,
      active: users.filter((u) => u.active).length,
    }),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.username.toLowerCase().includes(q));
  }, [users, filter]);

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

  function isSelf(u: UserRow) {
    return u.username === currentUsername;
  }

  function isLastActiveAdmin(u: UserRow) {
    return u.role === "ADMIN" && u.active && activeAdminCount <= 1;
  }

  async function handleCreate(username: string, password: string, role: Role) {
    if (role === "ADMIN") {
      setPending({ kind: "createAdmin", username, password, role });
      return;
    }
    try {
      await createUser(username, password, "USER");
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo crear usuario");
      throw err;
    }
  }

  async function runPending() {
    if (!pending) return;
    try {
      if (pending.kind === "createAdmin") {
        await createUser(pending.username, pending.password, pending.role);
      } else if (pending.kind === "role") {
        await updateUser(pending.user.id, { role: pending.nextRole });
      } else if (pending.kind === "toggleActive") {
        await updateUser(pending.user.id, { active: !pending.user.active });
      } else if (pending.kind === "delete") {
        await deleteUser(pending.user.id);
      }
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error");
    } finally {
      setPending(null);
    }
  }

  function confirmCopy(): { title: string; message: string; confirmLabel: string } | null {
    if (!pending) return null;
    switch (pending.kind) {
      case "createAdmin":
        return {
          title: "Crear administrador",
          message: `¿Dar rol ADMIN a "${pending.username}"? Tendrá control total de usuarios y datos.`,
          confirmLabel: "Crear admin",
        };
      case "role":
        return {
          title: "Cambiar rol",
          message:
            pending.nextRole === "ADMIN"
              ? `¿Promover a "${pending.user.username}" a administrador?`
              : `¿Quitar permisos de admin a "${pending.user.username}"?`,
          confirmLabel: "Cambiar rol",
        };
      case "toggleActive":
        return {
          title: pending.user.active ? "Desactivar cuenta" : "Activar cuenta",
          message: pending.user.active
            ? `¿Desactivar "${pending.user.username}"? No podrá iniciar sesión.`
            : `¿Reactivar "${pending.user.username}"?`,
          confirmLabel: pending.user.active ? "Desactivar" : "Activar",
        };
      case "delete":
        return {
          title: "Eliminar usuario",
          message: `¿Eliminar permanentemente "${pending.user.username}"? Solo si no tiene archivos, enlaces ni carpetas.`,
          confirmLabel: "Eliminar",
        };
    }
  }

  const confirm = confirmCopy();
  const menuUser = menu?.user;
  const menuSelf = menuUser ? isSelf(menuUser) : false;
  const menuLastAdmin = menuUser ? isLastActiveAdmin(menuUser) : false;
  const menuNextRole: Role | null =
    menuUser && menuUser.role === "ADMIN" ? "USER" : menuUser ? "ADMIN" : null;

  return (
    <div className="users-page users-page--list-only">
      <WorkspaceChrome
        title="Usuarios"
        subtitle="Cuentas, roles y acceso al sistema"
        stats={
          <span>
            {stats.active} activas · {stats.admins} admin
          </span>
        }
        toolbar={
          <>
            <input
              className="workspace-search"
              placeholder="Buscar usuario"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filtrar usuarios"
            />
            <div className="workspace-toolbar-actions">
              <button type="button" className="btn btn-compact primary" onClick={() => setCreateOpen(true)}>
                Nuevo usuario
              </button>
              <button
                type="button"
                className="btn btn-icon"
                onClick={() => void onRefresh()}
                disabled={loading}
                aria-label="Actualizar"
                title="Actualizar"
              >
                ↻
              </button>
            </div>
          </>
        }
      />

      <section className="users-card users-card--list" aria-label="Cuentas registradas">
        <div className="pf-table-wrap users-table-wrap">
          <table className="pf-table users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th className="col-actions-h">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty">
                    {loading
                      ? "Cargando…"
                      : filter
                        ? "Ningún usuario coincide con la búsqueda."
                        : "Sin usuarios."}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className={[
                      !u.active ? "users-row--inactive" : "",
                      isSelf(u) ? "users-row--self" : "",
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined}
                  >
                    <td>
                      <div className="user-identity">
                        <span
                          className={`user-avatar ${u.role === "ADMIN" ? "user-avatar--admin" : ""}`}
                          aria-hidden
                        >
                          {userInitial(u.username)}
                        </span>
                        <span className="user-identity-text">
                          <span className="user-name">{u.username}</span>
                          {isSelf(u) && <span className="user-you-pill">Tú</span>}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${u.role === "ADMIN" ? "admin" : ""}`}>
                        {u.role === "ADMIN" ? "Admin" : "Usuario"}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${u.active ? "status-pill--on" : ""}`}>
                        {u.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="users-actions-cell">
                      <button
                        type="button"
                        className="btn small user-menu-trigger"
                        aria-label={`Acciones para ${u.username}`}
                        aria-haspopup="menu"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenu({ user: u, x: rect.right, y: rect.bottom });
                        }}
                      >
                        Acciones ▾
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {menu && menuUser && (
        <div
          ref={menuRef}
          className="user-actions-menu"
          role="menu"
          style={{ top: menu.y + 4, left: Math.max(8, menu.x - 200) }}
        >
          <button
            type="button"
            role="menuitem"
            disabled={menuSelf || menuLastAdmin}
            onClick={() => {
              setMenu(null);
              if (menuNextRole) setPending({ kind: "role", user: menuUser, nextRole: menuNextRole });
            }}
          >
            {menuNextRole === "ADMIN" ? "Hacer administrador" : "Quitar rol admin"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(null);
              setResetUser(menuUser);
            }}
          >
            Cambiar contraseña
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={menuSelf || (menuLastAdmin && menuUser.active)}
            onClick={() => {
              setMenu(null);
              setPending({ kind: "toggleActive", user: menuUser });
            }}
          >
            {menuUser.active ? "Desactivar cuenta" : "Activar cuenta"}
          </button>
          {!menuSelf && (
            <button
              type="button"
              role="menuitem"
              className="user-actions-menu-danger"
              disabled={menuLastAdmin}
              onClick={() => {
                setMenu(null);
                setPending({ kind: "delete", user: menuUser });
              }}
            >
              Eliminar usuario
            </button>
          )}
        </div>
      )}

      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

      <ResetPasswordDialog
        open={resetUser !== null}
        username={resetUser?.username ?? ""}
        onClose={() => setResetUser(null)}
        onSave={async (password) => {
          if (!resetUser) return;
          await updateUser(resetUser.id, { password });
        }}
      />

      {confirm && (
        <ConfirmDialog
          open
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onCancel={() => setPending(null)}
          onConfirm={() => void runPending()}
        />
      )}
    </div>
  );
}
