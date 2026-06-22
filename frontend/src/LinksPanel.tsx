import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createLink,
  deleteLink,
  FileTagItem,
  FolderItem,
  FolderTagItem,
  formatDate,
  LinkItem,
  isSessionExpired,
  listLinks,
  setLinkTags,
  updateLink,
} from "./api";
import AddToSpaceworkDialog from "./AddToSpaceworkDialog";
import FileTagChips from "./FileTagChips";
import LinkSaveTagPicker, { type LinkSaveTagChoice } from "./LinkSaveTagPicker";
import LinkTagsTray from "./LinkTagsTray";
import { writeDraggedLinkId } from "./linkDrag";
import { LOOSE_FOLDER_LABEL } from "./folderUi";
import { FileMoveHintIcon } from "./SidebarIcons";
import WorkspaceChrome from "./WorkspaceChrome";
import type { FolderFilter } from "./ProjectsNav";
import { createTagDropHandlers } from "./tagDrag";
import { pinTagOnItem, unpinTagFromItem } from "./tagItemActions";

type Props = {
  folders: FolderItem[];
  folderFilter: FolderFilter;
  onFolderFilter?: (filter: FolderFilter) => void;
  allTags: FolderTagItem[];
  linkMoveNonce?: number;
  onSessionLost: () => void;
  onError: (msg: string) => void;
  onLinkDragStart?: () => void;
  onLinkDragEnd?: () => void;
  seedQuery?: string;
};

export default function LinksPanel({
  folders,
  folderFilter,
  onFolderFilter,
  allTags,
  seedQuery = "",
  linkMoveNonce = 0,
  onSessionLost,
  onError,
  onLinkDragStart,
  onLinkDragEnd,
}: Props) {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(seedQuery);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [saveTagChoice, setSaveTagChoice] = useState<LinkSaveTagChoice>("none");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tagDropTargetId, setTagDropTargetId] = useState<number | null>(null);
  const [tagPinning, setTagPinning] = useState(false);
  const [spaceworkLinkId, setSpaceworkLinkId] = useState<number | null>(null);
  const fetchGen = useRef(0);
  const onErrorRef = useRef(onError);
  const onSessionLostRef = useRef(onSessionLost);
  onErrorRef.current = onError;
  onSessionLostRef.current = onSessionLost;

  const folderNameById = useCallback(
    (folderId: number | null) => {
      if (folderId == null) return null;
      return folders.find((f) => f.id === folderId)?.name ?? "Carpeta";
    },
    [folders],
  );

  const scopeLabel = useMemo(() => {
    if (folderFilter === "all") return null;
    if (folderFilter === "none") return LOOSE_FOLDER_LABEL;
    return folders.find((f) => f.id === folderFilter)?.name ?? "Carpeta";
  }, [folderFilter, folders]);

  const showProjectColumn = folderFilter === "all" || folderFilter === "none";
  const tableColCount = (showProjectColumn ? 6 : 5);
  const folderForApi = useMemo((): FolderFilter => {
    if (folderFilter === "all" || folderFilter === "none") return folderFilter;
    if (folders.length === 0) return folderFilter;
    return folders.some((f) => f.id === folderFilter) ? folderFilter : "all";
  }, [folderFilter, folders]);

  const createFolderId = typeof folderForApi === "number" ? folderForApi : null;

  useEffect(() => {
    if (seedQuery) setQuery(seedQuery);
  }, [seedQuery]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setLinks([]);
    fetchGen.current += 1;
  }, [folderForApi, debouncedQuery]);

  const refresh = useCallback(async () => {
    const gen = ++fetchGen.current;
    setLoading(true);
    try {
      const rows = await listLinks({
        folder: folderForApi,
        q: debouncedQuery || undefined,
      });
      if (gen !== fetchGen.current) return;
      setLinks(rows);
      onErrorRef.current("");
    } catch (e) {
      if (gen !== fetchGen.current) return;
      const msg = e instanceof Error ? e.message : "Error";
      if (isSessionExpired(msg)) onSessionLostRef.current();
      else if (/carpeta no encontrada/i.test(msg)) {
        onErrorRef.current("");
        setLinks([]);
      } else onErrorRef.current(msg);
    } finally {
      if (gen === fetchGen.current) setLoading(false);
    }
  }, [debouncedQuery, folderForApi]);

  useEffect(() => {
    void refresh();
  }, [refresh, linkMoveNonce]);

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setTitle("");
    setUrl("");
    setSaveTagChoice("none");
  }

  function openNewForm() {
    setEditingId(null);
    setTitle("");
    setUrl("");
    setSaveTagChoice("none");
    setFormOpen(true);
  }

  function handleTagsSaved(linkId: number, tags: FileTagItem[]) {
    setLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, tags } : l)));
  }

  async function pinTagOnLink(link: LinkItem, tagId: number) {
    setTagPinning(true);
    try {
      const tags = await pinTagOnItem(setLinkTags, link.id, link.tags, tagId);
      handleTagsSaved(link.id, tags);
      onError("");
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo etiquetar");
    } finally {
      setTagPinning(false);
    }
  }

  async function unpinTagFromLink(link: LinkItem, tagId: number) {
    setTagPinning(true);
    try {
      const tags = await unpinTagFromItem(setLinkTags, link.id, link.tags, tagId);
      handleTagsSaved(link.id, tags);
      onError("");
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo quitar la etiqueta");
    } finally {
      setTagPinning(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    const u = url.trim();
    if (!t || !u) {
      onError("Título y URL son obligatorios");
      return;
    }
    setSaving(true);
    try {
      if (editingId != null) {
        const existing = links.find((l) => l.id === editingId);
        await updateLink(editingId, t, u, existing?.folderId ?? null);
      } else {
        const created = await createLink(t, u, createFolderId);
        if (saveTagChoice !== "none") {
          const tags = await setLinkTags(created.id, [saveTagChoice]);
          handleTagsSaved(created.id, tags);
        }
      }
      closeForm();
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar";
      if (isSessionExpired(msg)) onSessionLost();
      else onError(msg);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(link: LinkItem) {
    setEditingId(link.id);
    setTitle(link.title);
    setUrl(link.url);
    setSaveTagChoice("none");
    setFormOpen(true);
  }

  async function handleDelete(id: number) {
    if (!window.confirm("¿Eliminar este enlace?")) return;
    try {
      await deleteLink(id);
      if (editingId === id) closeForm();
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo eliminar";
      if (isSessionExpired(msg)) onSessionLost();
      else onError(msg);
    }
  }

  async function copyUrl(linkUrl: string) {
    try {
      await navigator.clipboard.writeText(linkUrl);
    } catch {
      onError("No se pudo copiar al portapapeles");
    }
  }

  return (
    <>
      <WorkspaceChrome
        title={scopeLabel ? `Enlaces — ${scopeLabel}` : "Enlaces"}
        subtitle={
          folderFilter === "all" ? (
            <>
              Arrastra <span className="links-page-sub-mark">⋮⋮</span> a una carpeta en la barra lateral
            </>
          ) : folderFilter === "none" ? (
            "Enlaces sin carpeta asignada"
          ) : (
            "Enlaces de esta carpeta"
          )
        }
        stats={
          loading && links.length > 0 ? (
            <span className="page-meta-loading">actualizando…</span>
          ) : (
            <span>
              {links.length} {links.length === 1 ? "enlace" : "enlaces"}
            </span>
          )
        }
        toolbar={
          <>
            <input
              className="workspace-search"
              placeholder="Buscar"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar enlaces"
            />
            <div className="workspace-toolbar-actions">
              <button type="button" className="btn btn-compact primary" onClick={openNewForm}>
                Nuevo
              </button>
              {typeof folderFilter !== "number" && onFolderFilter && (
                <button
                  type="button"
                  className={`btn btn-compact workspace-toolbar-btn${folderFilter === "none" ? " on" : ""}`}
                  aria-pressed={folderFilter === "none"}
                  onClick={() => onFolderFilter(folderFilter === "none" ? "all" : "none")}
                  title="Solo enlaces sin carpeta"
                >
                  Sueltos
                </button>
              )}
            </div>
          </>
        }
        secondary={<LinkTagsTray tags={allTags} />}
      />

      {formOpen && (
        <form className="link-form-panel" onSubmit={handleSubmit}>
          <div className="link-form-panel-head">
            <h3 className="link-form-panel-title">
              {editingId != null ? "Editar enlace" : "Nuevo enlace"}
            </h3>
            <button type="button" className="link-form-panel-close" aria-label="Cerrar" onClick={closeForm}>
              ×
            </button>
          </div>
          <div className="link-form-row">
            <label>
              <span className="field-label">Título</span>
              <input
                className="field-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Documentación API"
                maxLength={140}
                required
                autoFocus
              />
            </label>
            <label>
              <span className="field-label">URL</span>
              <input
                className="field-input"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                required
              />
            </label>
          </div>
          {editingId == null && (
            <LinkSaveTagPicker
              folders={folders}
              tags={allTags}
              value={saveTagChoice}
              onChange={setSaveTagChoice}
            />
          )}
          <div className="link-form-actions">
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? "Guardando…" : editingId != null ? "Guardar cambios" : "Guardar"}
            </button>
            <button type="button" className="btn" onClick={closeForm}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className={`pf-table-wrap ${loading && links.length > 0 ? "is-loading" : ""}`}>
        <table className="pf-table pf-table-links">
          <colgroup>
            <col className="col-w-link-title" />
            <col className="col-w-link-tags" />
            {showProjectColumn && <col className="col-w-link-folder" />}
            <col className="col-w-link-url" />
            <col className="col-w-link-date" />
            <col className="col-w-link-actions" />
          </colgroup>
          <thead>
            <tr>
              <th>Título</th>
              <th className="col-tags-h">Etiquetas</th>
              {showProjectColumn && <th className="col-folder-h">Proyecto</th>}
              <th>URL</th>
              <th>Guardado</th>
              <th className="col-actions-h">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && links.length === 0 ? (
              <tr>
                <td colSpan={tableColCount} className="empty">
                  Cargando…
                </td>
              </tr>
            ) : links.length === 0 ? (
              <tr>
                <td colSpan={tableColCount} className="empty">
                  {debouncedQuery ? (
                    "Ningún enlace coincide con la búsqueda."
                  ) : folderFilter === "none" ? (
                    "No hay enlaces sueltos."
                  ) : typeof folderFilter === "number" ? (
                    <>
                      No hay enlaces en esta carpeta.{" "}
                      <button type="button" className="btn ghost sm link-empty-cta" onClick={openNewForm}>
                        Añadir uno
                      </button>
                    </>
                  ) : (
                    <>
                      Sin enlaces aún.{" "}
                      <button type="button" className="btn ghost sm link-empty-cta" onClick={openNewForm}>
                        Añadir el primero
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ) : (
              links.map((link) => {
                const rowTags = link.tags ?? [];
                const dropHandlers = createTagDropHandlers(
                  link.id,
                  true,
                  setTagDropTargetId,
                  (_id, tagId) => void pinTagOnLink(link, tagId),
                );
                const isDropTarget = tagDropTargetId === link.id;
                const folderLabel = folderNameById(link.folderId);
                return (
                  <tr
                    key={link.id}
                    className={`file-row--pin-droppable file-row--draggable ${isDropTarget ? "file-row--pin-target" : ""} ${
                      editingId === link.id ? "link-row--editing" : ""
                    }`}
                    {...dropHandlers}
                  >
                    <td className="col-link-title col-name">
                      <div
                        className="file-name-row file-name-row--draggable"
                        draggable
                        title="Arrastra al proyecto en el sidebar"
                        onDragStart={(e) => {
                          e.stopPropagation();
                          writeDraggedLinkId(e.dataTransfer, link.id);
                          e.currentTarget.classList.add("is-dragging");
                          onLinkDragStart?.();
                        }}
                        onDragEnd={(e) => {
                          e.currentTarget.classList.remove("is-dragging");
                          onLinkDragEnd?.();
                        }}
                      >
                        <span className="file-drag-hint" aria-hidden>
                          <FileMoveHintIcon />
                        </span>
                        <div className="file-name-cell">
                          <span className="fname link-title-text" title={link.title}>
                            {link.title}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="col-tags col-row-pill">
                      <div className="file-tags-slot" aria-label="Etiquetas del enlace">
                        {rowTags.length > 0 ? (
                          <FileTagChips
                            tags={rowTags}
                            size="md"
                            removable={!tagPinning}
                            onRemove={(tagId) => void unpinTagFromLink(link, tagId)}
                          />
                        ) : (
                          <span className="file-tags-placeholder" aria-hidden>
                            —
                          </span>
                        )}
                      </div>
                    </td>
                    {showProjectColumn && (
                      <td className="col-link-folder col-row-pill">
                        {folderLabel ? (
                          <span className="link-folder-pill row-pill-text">{folderLabel}</span>
                        ) : (
                          <span className="link-folder-loose row-pill-text">Suelto</span>
                        )}
                      </td>
                    )}
                    <td className="col-link-url">
                      <a
                        className="cell-ellipsis link-url-anchor"
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={link.url}
                      >
                        {link.url}
                      </a>
                    </td>
                    <td className="col-meta col-link-date">{formatDate(link.createdAt)}</td>
                    <td className="col-actions">
                      <div className="row-actions">
                        <a
                          className="row-action-btn"
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Abrir
                        </a>
                        <button
                          type="button"
                          className="row-action-btn"
                          onClick={() => void copyUrl(link.url)}
                        >
                          Copiar
                        </button>
                        <button type="button" className="row-action-btn" onClick={() => startEdit(link)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="row-action-btn"
                          onClick={() => setSpaceworkLinkId(link.id)}
                        >
                          Spacework
                        </button>
                        <button
                          type="button"
                          className="row-action-btn row-action-danger"
                          onClick={() => void handleDelete(link.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AddToSpaceworkDialog
        open={spaceworkLinkId != null}
        linkId={spaceworkLinkId ?? undefined}
        onClose={() => setSpaceworkLinkId(null)}
        onError={onError}
        onSessionLost={onSessionLost}
      />
    </>
  );
}
