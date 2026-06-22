import { FormEvent, lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  createSpaceworkWikiPage,
  deleteSpaceworkWikiPage,
  formatDateCompact,
  getSpaceworkWikiPage,
  isSessionExpired,
  listSpaceworkWikiPages,
  ProjectRole,
  updateSpaceworkWikiPage,
  WikiPage,
  WikiPageSummary,
} from "./api";
import { subscribeSpaceworkWikiStream } from "./spaceworkWikiStream";
import { SpaceworkEmpty, SpaceworkLiveBadge, SpaceworkLoading } from "./spaceworkUi";
import { ScrollText } from "lucide-react";

const MarkdownPreviewPane = lazy(() => import("./MarkdownPreviewPane"));

type Props = {
  projectId: number;
  myRole: ProjectRole;
  initialSlug?: string | null;
  onSessionLost: () => void;
  onError: (msg: string) => void;
};

export default function SpaceworkWikiPanel({
  projectId,
  myRole,
  initialSlug,
  onSessionLost,
  onError,
}: Props) {
  const [pages, setPages] = useState<WikiPageSummary[]>([]);
  const [activeSlug, setActiveSlug] = useState("inicio");
  const [page, setPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const dirtyRef = useRef(false);

  const canEdit = myRole !== "VIEWER";
  const canDelete = myRole === "OWNER" || myRole === "ADMIN";

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

  const loadPages = useCallback(async () => {
    try {
      const rows = await listSpaceworkWikiPages(projectId);
      setPages(rows);
      if (rows.length > 0 && !rows.some((p) => p.slug === activeSlug)) {
        setActiveSlug(rows[0].slug);
      }
    } catch (err) {
      handleErr(err);
    }
  }, [projectId, activeSlug, handleErr]);

  const loadPage = useCallback(
    async (slug: string) => {
      setLoadingPage(true);
      try {
        const row = await getSpaceworkWikiPage(projectId, slug);
        setPage(row);
        if (!dirtyRef.current) {
          setDraftTitle(row.title);
          setDraftContent(row.content);
        }
      } catch (err) {
        handleErr(err);
      } finally {
        setLoadingPage(false);
      }
    },
    [projectId, handleErr],
  );

  useEffect(() => {
    setLoading(true);
    void loadPages().finally(() => setLoading(false));
  }, [loadPages]);

  useEffect(() => {
    if (initialSlug) setActiveSlug(initialSlug);
  }, [initialSlug]);

  useEffect(() => {
    if (loading || !activeSlug) return;
    if (pages.length > 0 && !pages.some((p) => p.slug === activeSlug)) return;
    dirtyRef.current = false;
    setEditing(false);
    void loadPage(activeSlug);
  }, [activeSlug, loading, pages, loadPage]);

  useEffect(() => {
    const stop = subscribeSpaceworkWikiStream(
      projectId,
      (updated) => {
        setPages((prev) => {
          const exists = prev.some((p) => p.slug === updated.slug);
          const summary: WikiPageSummary = {
            id: updated.id,
            slug: updated.slug,
            title: updated.title,
            updatedByUsername: updated.updatedByUsername,
            updatedAt: updated.updatedAt,
          };
          if (!exists) return [...prev, summary].sort((a, b) => a.title.localeCompare(b.title));
          return prev
            .map((p) => (p.slug === updated.slug ? summary : p))
            .sort((a, b) => a.title.localeCompare(b.title));
        });
        if (updated.slug === activeSlug && !dirtyRef.current) {
          setPage(updated);
          setDraftTitle(updated.title);
          setDraftContent(updated.content);
        }
      },
      (slug) => {
        setPages((prev) => prev.filter((p) => p.slug !== slug));
        if (slug === activeSlug) {
          setActiveSlug("inicio");
        }
      },
      (msg) => {
        setLiveConnected(false);
        if (isSessionExpired(msg)) onSessionLost();
      },
      () => setLiveConnected(true),
    );
    return () => {
      stop();
      setLiveConnected(false);
    };
  }, [projectId, activeSlug, onSessionLost]);

  function startEdit() {
    if (!page || !canEdit) return;
    setDraftTitle(page.title);
    setDraftContent(page.content);
    dirtyRef.current = true;
    setEditing(true);
  }

  function cancelEdit() {
    if (page) {
      setDraftTitle(page.title);
      setDraftContent(page.content);
    }
    dirtyRef.current = false;
    setEditing(false);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!page || !canEdit) return;
    setSaving(true);
    try {
      const updated = await updateSpaceworkWikiPage(projectId, page.slug, {
        title: draftTitle.trim(),
        content: draftContent,
      });
      setPage(updated);
      dirtyRef.current = false;
      setEditing(false);
      await loadPages();
    } catch (err) {
      handleErr(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newSlug.trim() || !newTitle.trim()) return;
    setCreating(true);
    try {
      const created = await createSpaceworkWikiPage(
        projectId,
        newSlug.trim().toLowerCase(),
        newTitle.trim(),
      );
      setCreateOpen(false);
      setNewSlug("");
      setNewTitle("");
      await loadPages();
      setActiveSlug(created.slug);
    } catch (err) {
      handleErr(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!page || page.slug === "inicio" || !canDelete) return;
    if (!window.confirm(`¿Eliminar la página «${page.title}»?`)) return;
    try {
      await deleteSpaceworkWikiPage(projectId, page.slug);
      await loadPages();
      setActiveSlug("inicio");
    } catch (err) {
      handleErr(err);
    }
  }

  if (loading) {
    return <SpaceworkLoading label="Cargando wiki…" />;
  }

  return (
    <div className="spacework-wiki">
      <aside className="spacework-wiki-sidebar" aria-label="Páginas wiki">
        <header className="spacework-wiki-sidebar__head">
          <span className="spacework-wiki-sidebar__title">
            Wiki
            {liveConnected ? <SpaceworkLiveBadge /> : null}
          </span>
          {canEdit && (
            <button type="button" className="btn ghost sm" onClick={() => setCreateOpen(true)}>
              + Página
            </button>
          )}
        </header>
        <ul className="spacework-wiki-page-list">
          {pages.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={["spacework-wiki-page-btn", activeSlug === p.slug && "on"]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setActiveSlug(p.slug)}
              >
                <span className="spacework-wiki-page-btn__title">{p.title}</span>
                <span className="spacework-wiki-page-btn__meta muted">
                  {p.updatedByUsername} · {formatDateCompact(p.updatedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="spacework-wiki-main">
        {loadingPage && !page ? (
          <SpaceworkLoading label="Cargando página…" />
        ) : page ? (
          <>
            <header className="spacework-wiki-toolbar">
              {editing ? (
                <input
                  className="spacework-wiki-title-input"
                  value={draftTitle}
                  onChange={(e) => {
                    dirtyRef.current = true;
                    setDraftTitle(e.target.value);
                  }}
                  maxLength={200}
                  required
                />
              ) : (
                <h2 className="spacework-wiki-page-title">{page.title}</h2>
              )}
              <div className="spacework-wiki-toolbar__actions">
                {canEdit && !editing && (
                  <button type="button" className="btn sm" onClick={startEdit}>
                    Editar
                  </button>
                )}
                {editing && (
                  <>
                    <button type="button" className="btn ghost sm" onClick={cancelEdit}>
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      form="spacework-wiki-form"
                      className="btn primary sm"
                      disabled={saving}
                    >
                      {saving ? "Guardando…" : "Guardar"}
                    </button>
                  </>
                )}
                {canDelete && page.slug !== "inicio" && !editing && (
                  <button type="button" className="btn ghost sm danger" onClick={() => void handleDelete()}>
                    Borrar
                  </button>
                )}
              </div>
            </header>

            {editing ? (
              <form
                id="spacework-wiki-form"
                className="spacework-wiki-editor"
                onSubmit={(e) => void handleSave(e)}
              >
                <textarea
                  value={draftContent}
                  onChange={(e) => {
                    dirtyRef.current = true;
                    setDraftContent(e.target.value);
                  }}
                  placeholder="Markdown…"
                  spellCheck={true}
                />
              </form>
            ) : (
              <div className="spacework-wiki-preview">
                <Suspense fallback={<p className="muted pad">Cargando vista…</p>}>
                  <MarkdownPreviewPane content={page.content} fileName={`${page.slug}.md`} />
                </Suspense>
              </div>
            )}
          </>
        ) : (
          <div className="spacework-wiki-empty">
            <SpaceworkEmpty
              icon={ScrollText}
              title="Selecciona una página"
              hint="Elige una página del índice o crea una nueva para documentar el proyecto."
            />
          </div>
        )}
      </div>

      {createOpen && (
        <div className="confirm-backdrop" role="presentation" onClick={() => setCreateOpen(false)}>
          <form
            className="confirm-card spacework-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void handleCreate(e)}
          >
            <h2>Nueva página wiki</h2>
            <label className="field">
              <span>Slug (URL)</span>
              <input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="reuniones"
                pattern="[a-zA-Z0-9][a-zA-Z0-9_\-]*"
                required
                autoFocus
              />
            </label>
            <label className="field">
              <span>Título</span>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={200}
                required
              />
            </label>
            <p className="muted">Letras, números, guión o guión bajo. Sin espacios.</p>
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
