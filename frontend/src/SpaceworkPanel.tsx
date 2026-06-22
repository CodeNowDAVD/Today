import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Activity, FolderKanban, Link2 } from "lucide-react";
import FileIcon from "./FileIcon";
import {
  addSpaceworkFile,
  addSpaceworkLink,
  archiveSpaceworkProject,
  cancelSpaceworkInvitation,
  createSpaceworkInvitation,
  createSpaceworkProject,
  downloadFile,
  formatDateCompact,
  isSessionExpired,
  listFilesPage,
  listLinks,
  listSpaceworkActivity,
  listSpaceworkInvitations,
  listSpaceworkItems,
  listSpaceworkMembers,
  listSpaceworkProjects,
  ProjectRole,
  removeSpaceworkItem,
  removeSpaceworkMember,
  searchUsers,
  SpaceworkInvitation,
  transferSpaceworkOwnership,
  updateSpaceworkMemberRole,
  updateSpaceworkProject,
  SpaceworkActivity,
  SpaceworkItem,
  SpaceworkMember,
  SpaceworkProject,
} from "./api";
import SpaceworkChatPanel from "./SpaceworkChatPanel";
import SpaceworkFileComments from "./SpaceworkFileComments";
import SpaceworkKanbanPanel from "./SpaceworkKanbanPanel";
import SpaceworkWikiPanel from "./SpaceworkWikiPanel";
import SpaceworkPresentationPanel from "./SpaceworkPresentationPanel";
import FilePreviewPane from "./FilePreviewPane";
import { spaceworkItemToFile } from "./spaceworkUtils";
import WorkspaceChrome from "./WorkspaceChrome";
import type { SpaceworkNavTarget } from "./spaceworkNav";
import {
  SPACEWORK_TABS,
  SpaceworkAvatar,
  SpaceworkEmpty,
  SpaceworkLoading,
  SpaceworkRoleBadge,
  SpaceworkSection,
  projectAccentStyle,
  type SpaceworkTabId,
} from "./spaceworkUi";

type Tab = SpaceworkTabId;

type Props = {
  sessionUsername: string;
  navTarget?: SpaceworkNavTarget | null;
  wikiInitialSlug?: string | null;
  onNavConsumed?: () => void;
  onSessionLost: () => void;
  onError: (msg: string) => void;
};

function canManageMembers(role: ProjectRole) {
  return role === "OWNER" || role === "ADMIN";
}

function canAddItems(role: ProjectRole) {
  return role !== "VIEWER";
}

export default function SpaceworkPanel({
  sessionUsername,
  navTarget,
  wikiInitialSlug,
  onNavConsumed,
  onSessionLost,
  onError,
}: Props) {
  const [projects, setProjects] = useState<SpaceworkProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [project, setProject] = useState<SpaceworkProject | null>(null);
  const [tab, setTab] = useState<Tab>("items");
  const [items, setItems] = useState<SpaceworkItem[]>([]);
  const [members, setMembers] = useState<SpaceworkMember[]>([]);
  const [activity, setActivity] = useState<SpaceworkActivity[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const [addFileOpen, setAddFileOpen] = useState(false);
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [myFiles, setMyFiles] = useState<{ id: number; name: string }[]>([]);
  const [myLinks, setMyLinks] = useState<{ id: number; title: string }[]>([]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState<"username" | "email">("username");
  const [inviteUser, setInviteUser] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [inviteSuggestions, setInviteSuggestions] = useState<{ id: number; username: string }[]>([]);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<SpaceworkInvitation[]>([]);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDesc, setEditProjectDesc] = useState("");
  const [savingProject, setSavingProject] = useState(false);
  const [previewItem, setPreviewItem] = useState<SpaceworkItem | null>(null);
  const [pendingFileId, setPendingFileId] = useState<number | null>(null);
  const [archiving, setArchiving] = useState(false);

  const handleErr = useCallback(
    (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Error";
      if (isSessionExpired(msg)) {
        onSessionLost();
        return;
      }
      onError(msg);
    },
    [onError, onSessionLost],
  );

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listSpaceworkProjects();
      setProjects(rows);
    } catch (err) {
      handleErr(err);
    } finally {
      setLoading(false);
    }
  }, [handleErr]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!navTarget) return;
    setSelectedId(navTarget.projectId);
    if (navTarget.tab) setTab(navTarget.tab);
    if (navTarget.fileId != null) setPendingFileId(navTarget.fileId);
    onNavConsumed?.();
  }, [navTarget, onNavConsumed]);

  useEffect(() => {
    if (pendingFileId == null || items.length === 0) return;
    const item = items.find((i) => i.fileId === pendingFileId);
    if (item) {
      setTab("items");
      setPreviewItem(item);
      setPendingFileId(null);
    }
  }, [pendingFileId, items]);

  const loadDetail = useCallback(
    async (projectId: number, activeTab: Tab) => {
      setDetailLoading(true);
      try {
        const p = await listSpaceworkProjects().then((rows) =>
          rows.find((r) => r.id === projectId),
        );
        if (p) setProject(p);
        if (activeTab === "items" || activeTab === "presentation" || activeTab === "tasks") {
          setItems(await listSpaceworkItems(projectId));
        }
        if (activeTab === "members" || activeTab === "tasks") {
          setMembers(await listSpaceworkMembers(projectId));
          if (canManageMembers(p?.myRole ?? "VIEWER")) {
            setPendingInvitations(await listSpaceworkInvitations(projectId));
          } else {
            setPendingInvitations([]);
          }
        }
        if (activeTab === "activity") {
          setActivity(await listSpaceworkActivity(projectId));
        }
      } catch (err) {
        handleErr(err);
      } finally {
        setDetailLoading(false);
      }
    },
    [handleErr],
  );

  useEffect(() => {
    if (selectedId == null) return;
    void loadDetail(selectedId, tab);
  }, [selectedId, tab, loadDetail]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedId) ?? project,
    [projects, selectedId, project],
  );

  const previewFile = useMemo(
    () => (previewItem ? spaceworkItemToFile(previewItem) : null),
    [previewItem],
  );

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await createSpaceworkProject(newName.trim(), newDesc.trim() || undefined);
      setProjects((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      setSelectedId(created.id);
      setTab("items");
    } catch (err) {
      handleErr(err);
    } finally {
      setCreating(false);
    }
  }

  async function openFilePicker() {
    setAddFileOpen(true);
    setPickerLoading(true);
    try {
      const page = await listFilesPage({ page: 0, size: 100 });
      const mine = page.content
        .filter((f) => f.ownerUsername === sessionUsername)
        .map((f) => ({ id: f.id, name: f.originalName }));
      setMyFiles(mine);
    } catch (err) {
      handleErr(err);
      setAddFileOpen(false);
    } finally {
      setPickerLoading(false);
    }
  }

  async function openLinkPicker() {
    setAddLinkOpen(true);
    setPickerLoading(true);
    try {
      const rows = await listLinks();
      setMyLinks(rows.map((l) => ({ id: l.id, title: l.title })));
    } catch (err) {
      handleErr(err);
      setAddLinkOpen(false);
    } finally {
      setPickerLoading(false);
    }
  }

  async function handleAddFile(fileId: number) {
    if (selectedId == null) return;
    try {
      await addSpaceworkFile(selectedId, fileId);
      setAddFileOpen(false);
      await loadDetail(selectedId, "items");
      void loadProjects();
    } catch (err) {
      handleErr(err);
    }
  }

  async function handleAddLink(linkId: number) {
    if (selectedId == null) return;
    try {
      await addSpaceworkLink(selectedId, linkId);
      setAddLinkOpen(false);
      await loadDetail(selectedId, "items");
      void loadProjects();
    } catch (err) {
      handleErr(err);
    }
  }

  async function handleRemoveItem(item: SpaceworkItem) {
    if (selectedId == null) return;
    try {
      await removeSpaceworkItem(selectedId, item.id);
      await loadDetail(selectedId, "items");
      void loadProjects();
    } catch (err) {
      handleErr(err);
    }
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (selectedId == null) return;
    setInviting(true);
    setLastInviteUrl(null);
    try {
      const created = await createSpaceworkInvitation(
        selectedId,
        inviteMode === "email"
          ? { email: inviteEmail.trim(), role: inviteRole }
          : { username: inviteUser.trim(), role: inviteRole },
      );
      if (inviteMode === "email") {
        setLastInviteUrl(created.inviteUrl ?? null);
      } else {
        setInviteOpen(false);
        setInviteUser("");
      }
      setInviteEmail("");
      setInviteRole("MEMBER");
      await loadDetail(selectedId, "members");
      void loadProjects();
    } catch (err) {
      handleErr(err);
    } finally {
      setInviting(false);
    }
  }

  async function handleLeaveProject() {
    if (selectedId == null) return;
    const me = members.find((m) => m.username === sessionUsername);
    if (!me) return;
    if (
      !window.confirm("¿Seguro? No podrás volver a menos que te inviten de nuevo.")
    ) {
      return;
    }
    try {
      await removeSpaceworkMember(selectedId, me.userId);
      setSelectedId(null);
      setProject(null);
      await loadProjects();
    } catch (err) {
      handleErr(err);
    }
  }

  async function handleSaveProject(e: FormEvent) {
    e.preventDefault();
    if (selectedId == null || !editProjectName.trim()) return;
    setSavingProject(true);
    try {
      const updated = await updateSpaceworkProject(
        selectedId,
        editProjectName.trim(),
        editProjectDesc.trim() || undefined,
      );
      setProject(updated);
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditProjectOpen(false);
    } catch (err) {
      handleErr(err);
    } finally {
      setSavingProject(false);
    }
  }

  async function handleTransferOwnership(userId: number) {
    if (selectedId == null) return;
    if (
      !window.confirm(
        "Esta acción es permanente. Pasarás a ser Admin. ¿Transferir la propiedad?",
      )
    ) {
      return;
    }
    try {
      await transferSpaceworkOwnership(selectedId, userId);
      await loadDetail(selectedId, "members");
      void loadProjects();
    } catch (err) {
      handleErr(err);
    }
  }

  useEffect(() => {
    if (!inviteOpen || inviteMode !== "username" || selectedId == null) {
      setInviteSuggestions([]);
      return;
    }
    const q = inviteUser.trim();
    if (q.length < 2) {
      setInviteSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void searchUsers(q, selectedId)
        .then(setInviteSuggestions)
        .catch(() => setInviteSuggestions([]));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [inviteOpen, inviteMode, inviteUser, selectedId]);

  async function handleRemoveMember(userId: number) {
    if (selectedId == null) return;
    try {
      await removeSpaceworkMember(selectedId, userId);
      await loadDetail(selectedId, "members");
      void loadProjects();
    } catch (err) {
      handleErr(err);
    }
  }

  async function handleMemberRoleChange(userId: number, role: ProjectRole) {
    if (selectedId == null) return;
    try {
      await updateSpaceworkMemberRole(selectedId, userId, role);
      await loadDetail(selectedId, "members");
    } catch (err) {
      handleErr(err);
    }
  }

  if (selectedId == null) {
    return (
      <div className="spacework-panel">
        <WorkspaceChrome
          title="Spacework"
          subtitle="Proyectos colaborativos. Los archivos siguen en la bóveda de quien los subió; aquí solo se enlazan."
          toolbar={
            <button type="button" className="btn primary" onClick={() => setCreateOpen(true)}>
              Nuevo proyecto
            </button>
          }
        />
        {loading ? (
          <SpaceworkLoading label="Cargando proyectos…" />
        ) : projects.length === 0 ? (
          <SpaceworkEmpty
            icon={FolderKanban}
            title="Aún no tienes proyectos"
            hint="Crea un espacio colaborativo para enlazar archivos, tareas, wiki y chat con tu equipo."
          >
            <button type="button" className="btn primary" onClick={() => setCreateOpen(true)}>
              Crear el primero
            </button>
          </SpaceworkEmpty>
        ) : (
          <div className="spacework-grid">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                className="spacework-card"
                style={projectAccentStyle(p.id)}
                onClick={() => {
                  setSelectedId(p.id);
                  setTab("items");
                }}
              >
                <div className="spacework-card__head">
                  <span className="spacework-card__glyph" aria-hidden>
                    {p.name.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                  <span className="spacework-card__name">{p.name}</span>
                </div>
                {p.description ? (
                  <span className="spacework-card__desc">{p.description}</span>
                ) : null}
                <span className="spacework-card__meta">
                  <span className="spacework-card__chip">{p.memberCount} miembros</span>
                  <span className="spacework-card__chip">{p.itemCount} elementos</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {createOpen && (
          <div className="confirm-backdrop" role="presentation" onClick={() => setCreateOpen(false)}>
            <form
              className="confirm-card spacework-modal"
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => void handleCreate(e)}
            >
              <h2>Nuevo proyecto</h2>
              <label className="field">
                <span>Nombre</span>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={120}
                  required
                  autoFocus
                />
              </label>
              <label className="field">
                <span>Descripción (opcional)</span>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </label>
              <div className="confirm-actions">
                <button type="button" className="btn" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn primary" disabled={creating}>
                  {creating ? "Creando…" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  const myRole = selectedProject?.myRole ?? "VIEWER";

  async function handleArchive() {
    if (selectedId == null) return;
    if (!window.confirm("¿Archivar este proyecto? Dejará de aparecer en la lista.")) return;
    setArchiving(true);
    try {
      await archiveSpaceworkProject(selectedId);
      setSelectedId(null);
      setProject(null);
      setPreviewItem(null);
      await loadProjects();
    } catch (err) {
      handleErr(err);
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="spacework-panel">
      <WorkspaceChrome
        title={selectedProject?.name ?? "Proyecto"}
        subtitle={
          selectedProject?.description ??
          `Creado por ${selectedProject?.createdByUsername ?? "—"}`
        }
        stats={
          selectedProject ? (
            <span className="spacework-project-stats">
              <span className="spacework-card__chip">{selectedProject.memberCount} miembros</span>
              <span className="spacework-card__chip">{selectedProject.itemCount} elementos</span>
              <SpaceworkRoleBadge role={myRole} />
            </span>
          ) : null
        }
        toolbar={
          <div className="spacework-toolbar">
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setSelectedId(null);
                setProject(null);
              }}
            >
              ← Proyectos
            </button>
            {(myRole === "OWNER" || myRole === "ADMIN") && selectedProject && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setEditProjectName(selectedProject.name);
                  setEditProjectDesc(selectedProject.description ?? "");
                  setEditProjectOpen(true);
                }}
              >
                Editar proyecto
              </button>
            )}
            {tab === "items" && canAddItems(myRole) && (
              <>
                <button type="button" className="btn" onClick={() => void openFilePicker()}>
                  Añadir archivo
                </button>
                <button type="button" className="btn" onClick={() => void openLinkPicker()}>
                  Añadir enlace
                </button>
              </>
            )}
            {tab === "members" && canManageMembers(myRole) && (
              <button type="button" className="btn primary" onClick={() => setInviteOpen(true)}>
                Invitar
              </button>
            )}
            {myRole === "OWNER" && (
              <button
                type="button"
                className="btn ghost danger"
                disabled={archiving}
                onClick={() => void handleArchive()}
              >
                {archiving ? "Archivando…" : "Archivar proyecto"}
              </button>
            )}
          </div>
        }
        secondary={
          <nav className="spacework-tabs" aria-label="Secciones del proyecto">
            {SPACEWORK_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`spacework-tab ${tab === id ? "on" : ""}`}
                onClick={() => setTab(id)}
              >
                <Icon size={15} strokeWidth={2} aria-hidden />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        }
      />

      {detailLoading && tab !== "chat" && tab !== "presentation" && tab !== "tasks" && tab !== "wiki" ? (
        <SpaceworkLoading label="Cargando proyecto…" />
      ) : tab === "chat" && selectedId != null ? (
        <SpaceworkChatPanel
          projectId={selectedId}
          myRole={myRole}
          sessionUsername={sessionUsername}
          onSessionLost={onSessionLost}
          onError={onError}
        />
      ) : tab === "presentation" && selectedId != null ? (
        <SpaceworkPresentationPanel
          projectId={selectedId}
          myRole={myRole}
          sessionUsername={sessionUsername}
          items={items}
          onSessionLost={onSessionLost}
          onError={onError}
        />
      ) : tab === "tasks" && selectedId != null ? (
        <SpaceworkKanbanPanel
          projectId={selectedId}
          myRole={myRole}
          members={members}
          projectFiles={items
            .filter((i) => i.kind === "FILE" && i.fileId != null)
            .map((i) => ({ id: i.fileId!, name: i.fileName ?? "Archivo" }))}
          onSessionLost={onSessionLost}
          onError={onError}
        />
      ) : tab === "wiki" && selectedId != null ? (
        <SpaceworkWikiPanel
          projectId={selectedId}
          myRole={myRole}
          initialSlug={wikiInitialSlug}
          onSessionLost={onSessionLost}
          onError={onError}
        />
      ) : tab === "items" ? (
        <div
          className={[
            "spacework-items-view",
            previewFile && "spacework-items-view--preview",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <SpaceworkSection className="spacework-items pad">
            {items.length === 0 ? (
              <SpaceworkEmpty
                icon={FolderKanban}
                title="Sin archivos ni enlaces"
                hint={
                  canAddItems(myRole)
                    ? "Enlaza documentos de tu biblioteca o enlaces guardados para compartirlos en el proyecto."
                    : "Todavía no hay elementos compartidos en este proyecto."
                }
              >
                {canAddItems(myRole) ? (
                  <>
                    <button type="button" className="btn primary" onClick={() => void openFilePicker()}>
                      Añadir archivo
                    </button>
                    <button type="button" className="btn" onClick={() => void openLinkPicker()}>
                      Añadir enlace
                    </button>
                  </>
                ) : null}
              </SpaceworkEmpty>
            ) : (
              <ul className="spacework-item-list">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={[
                      "spacework-item-row",
                      previewItem?.id === item.id && "spacework-item-row--selected",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div
                      className={[
                        "spacework-item-icon",
                        item.kind === "LINK" && "spacework-item-icon--link",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {item.kind === "FILE" && item.fileName ? (
                        <FileIcon originalName={item.fileName} />
                      ) : (
                        <Link2 size={18} strokeWidth={2} aria-hidden />
                      )}
                    </div>
                    <div className="spacework-item-body">
                      {item.kind === "FILE" ? (
                        <>
                          <span className="spacework-item-kind">Archivo</span>
                          <button
                            type="button"
                            className="spacework-item-title spacework-item-title--btn"
                            onClick={() => setPreviewItem(item)}
                          >
                            {item.fileName}
                          </button>
                          <span className="spacework-item-sub">
                            {item.fileOwnerUsername} · {formatDateCompact(item.addedAt)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="spacework-item-kind">Enlace</span>
                          <a
                            className="spacework-item-title"
                            href={item.linkUrl ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {item.linkTitle}
                          </a>
                          <span className="spacework-item-sub">{formatDateCompact(item.addedAt)}</span>
                        </>
                      )}
                    </div>
                    <div className="spacework-item-actions">
                      {item.kind === "FILE" && item.fileId != null && item.fileName && (
                        <>
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() => setPreviewItem(item)}
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() =>
                              void downloadFile(item.fileId!, item.fileName!).catch(handleErr)
                            }
                          >
                            Descargar
                          </button>
                        </>
                      )}
                      {(canManageMembers(myRole) || item.addedByUsername === sessionUsername) && (
                        <button
                          type="button"
                          className="btn ghost sm danger"
                          onClick={() => void handleRemoveItem(item)}
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SpaceworkSection>
          {previewFile && selectedId != null && (
            <div className="spacework-preview-slot">
              <FilePreviewPane
                compactHead
                file={previewFile}
                isTrash={false}
                canEdit={false}
                copyBusy={false}
                onDownload={() =>
                  void downloadFile(previewFile.id, previewFile.originalName).catch(handleErr)
                }
                onTrash={() => {}}
                onRestore={() => {}}
                onClose={() => setPreviewItem(null)}
              />
              <SpaceworkFileComments
                projectId={selectedId}
                fileId={previewFile.id}
                myRole={myRole}
                sessionUsername={sessionUsername}
                onSessionLost={onSessionLost}
                onError={onError}
              />
            </div>
          )}
        </div>
      ) : tab === "members" ? (
        <SpaceworkSection className="pad">
          {pendingInvitations.length > 0 && canManageMembers(myRole) && (
            <div className="spacework-pending-invites" style={{ marginBottom: "1rem" }}>
              <h3 className="spacework-section-title">Invitaciones pendientes</h3>
              <ul className="spacework-invite-list">
                {pendingInvitations.map((inv) => (
                  <li key={inv.id} className="spacework-invite-row">
                    <span>
                      {inv.inviteeUsername ?? inv.email} · {inv.role}
                    </span>
                    <button
                      type="button"
                      className="btn ghost sm danger"
                      onClick={() =>
                        void cancelSpaceworkInvitation(selectedId!, inv.id).then(() =>
                          loadDetail(selectedId!, "members"),
                        )
                      }
                    >
                      Cancelar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="spacework-member-list">
            {members.map((m) => (
              <li key={m.userId} className="spacework-member-row">
                <div className="spacework-member-main">
                  <SpaceworkAvatar name={m.username} size="md" />
                  <div className="spacework-member-text">
                    <span className="spacework-member-name">{m.username}</span>
                    {m.username === sessionUsername ? (
                      <span className="spacework-member-you">Tú</span>
                    ) : null}
                  </div>
                </div>
                <div className="spacework-member-actions">
                  {canManageMembers(myRole) && m.role !== "OWNER" ? (
                    <select
                      className="spacework-member-role-select"
                      value={m.role}
                      onChange={(e) =>
                        void handleMemberRoleChange(m.userId, e.target.value as ProjectRole)
                      }
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Miembro</option>
                      <option value="VIEWER">Solo lectura</option>
                    </select>
                  ) : (
                    <SpaceworkRoleBadge role={m.role} />
                  )}
                  {myRole === "OWNER" && m.role === "ADMIN" && m.username !== sessionUsername && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => void handleTransferOwnership(m.userId)}
                    >
                      Transferir propiedad
                    </button>
                  )}
                  {canManageMembers(myRole) && m.role !== "OWNER" && (
                    <button
                      type="button"
                      className="btn ghost sm danger"
                      onClick={() => void handleRemoveMember(m.userId)}
                    >
                      Quitar
                    </button>
                  )}
                  {m.username === sessionUsername && myRole !== "OWNER" && (
                    <button
                      type="button"
                      className="btn ghost sm danger"
                      onClick={() => void handleLeaveProject()}
                    >
                      Salir del proyecto
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {myRole === "OWNER" && (
            <p className="muted" style={{ marginTop: "0.75rem", fontSize: "0.8125rem" }}>
              Como dueño no puedes salir del proyecto. Transfiere la propiedad primero.
            </p>
          )}
        </SpaceworkSection>
      ) : (
        <SpaceworkSection className="pad">
          {activity.length === 0 ? (
            <SpaceworkEmpty
              icon={Activity}
              title="Sin actividad todavía"
              hint="Aquí aparecerán invitaciones, cambios en archivos, tareas y otras acciones del equipo."
            />
          ) : (
            <ul className="spacework-activity-timeline">
              {activity.map((a) => (
                <li key={a.id} className="spacework-activity-item">
                  <span className="spacework-activity-item__dot" aria-hidden />
                  <div>
                    <p className="spacework-activity-item__summary">{a.summary}</p>
                    <p className="spacework-activity-item__meta">
                      {a.actorUsername} · {formatDateCompact(a.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SpaceworkSection>
      )}

      {addFileOpen && (
        <div className="confirm-backdrop" role="presentation" onClick={() => setAddFileOpen(false)}>
          <div className="confirm-card spacework-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Añadir archivo</h2>
            <p className="muted">Solo puedes enlazar archivos de tu biblioteca personal.</p>
            {pickerLoading ? (
              <p>Cargando…</p>
            ) : myFiles.length === 0 ? (
              <p className="muted">No hay archivos activos tuyos.</p>
            ) : (
              <ul className="spacework-picker-list">
                {myFiles.map((f) => (
                  <li key={f.id}>
                    <button type="button" className="spacework-picker-item" onClick={() => void handleAddFile(f.id)}>
                      {f.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={() => setAddFileOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {addLinkOpen && (
        <div className="confirm-backdrop" role="presentation" onClick={() => setAddLinkOpen(false)}>
          <div className="confirm-card spacework-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Añadir enlace</h2>
            {pickerLoading ? (
              <p>Cargando…</p>
            ) : myLinks.length === 0 ? (
              <p className="muted">No tienes enlaces guardados.</p>
            ) : (
              <ul className="spacework-picker-list">
                {myLinks.map((l) => (
                  <li key={l.id}>
                    <button type="button" className="spacework-picker-item" onClick={() => void handleAddLink(l.id)}>
                      {l.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={() => setAddLinkOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {inviteOpen && (
        <div className="confirm-backdrop" role="presentation" onClick={() => setInviteOpen(false)}>
          <form
            className="confirm-card spacework-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void handleInvite(e)}
          >
            <h2>Invitar miembro</h2>
            <div className="spacework-invite-tabs">
              <button
                type="button"
                className={inviteMode === "username" ? "on" : ""}
                onClick={() => setInviteMode("username")}
              >
                Usuario
              </button>
              <button
                type="button"
                className={inviteMode === "email" ? "on" : ""}
                onClick={() => setInviteMode("email")}
              >
                Email
              </button>
            </div>
            {inviteMode === "username" ? (
              <label className="field">
                <span>Usuario</span>
                <input
                  value={inviteUser}
                  onChange={(e) => setInviteUser(e.target.value)}
                  required
                  autoFocus
                  placeholder="nombre de usuario"
                  autoComplete="off"
                />
                {inviteSuggestions.length > 0 && (
                  <ul className="spacework-user-suggestions">
                    {inviteSuggestions.map((u) => (
                      <li key={u.id}>
                        <button type="button" onClick={() => setInviteUser(u.username)}>
                          @{u.username}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </label>
            ) : (
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="correo@ejemplo.com"
                />
              </label>
            )}
            <label className="field">
              <span>Rol</span>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as ProjectRole)}
              >
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Miembro</option>
                <option value="VIEWER">Solo lectura</option>
              </select>
            </label>
            {lastInviteUrl && (
              <p className="spacework-invite-link muted">
                Enlace de invitación (7 días):{" "}
                <a href={lastInviteUrl} target="_blank" rel="noreferrer">
                  {lastInviteUrl}
                </a>
              </p>
            )}
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={() => setInviteOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn primary" disabled={inviting}>
                {inviting ? "Enviando…" : inviteMode === "email" ? "Crear invitación" : "Invitar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {editProjectOpen && selectedProject && (
        <div className="confirm-backdrop" role="presentation" onClick={() => setEditProjectOpen(false)}>
          <form
            className="confirm-card spacework-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void handleSaveProject(e)}
          >
            <h2>Editar proyecto</h2>
            <label className="field">
              <span>Nombre</span>
              <input
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                maxLength={120}
                required
                autoFocus
              />
            </label>
            <label className="field">
              <span>Descripción</span>
              <textarea
                value={editProjectDesc}
                onChange={(e) => setEditProjectDesc(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </label>
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={() => setEditProjectOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn primary" disabled={savingProject}>
                {savingProject ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
