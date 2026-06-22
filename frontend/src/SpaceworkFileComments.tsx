import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  addSpaceworkFileComment,
  deleteSpaceworkFileComment,
  formatDateCompact,
  isSessionExpired,
  listSpaceworkFileComments,
  ProjectRole,
  SpaceworkFileComment,
} from "./api";
import { appendComment, subscribeSpaceworkFileCommentStream } from "./spaceworkFileCommentStream";
import { SpaceworkAvatar, SpaceworkLiveBadge } from "./spaceworkUi";

type Props = {
  projectId: number;
  fileId: number;
  myRole: ProjectRole;
  sessionUsername: string;
  onSessionLost: () => void;
  onError: (msg: string) => void;
};

export default function SpaceworkFileComments({
  projectId,
  fileId,
  myRole,
  sessionUsername,
  onSessionLost,
  onError,
}: Props) {
  const [comments, setComments] = useState<SpaceworkFileComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);

  const canComment = myRole !== "VIEWER";

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

  const load = useCallback(async () => {
    try {
      setComments(await listSpaceworkFileComments(projectId, fileId));
    } catch (err) {
      handleErr(err);
    } finally {
      setLoading(false);
    }
  }, [projectId, fileId, handleErr]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    setLiveConnected(false);
    const stop = subscribeSpaceworkFileCommentStream(
      projectId,
      fileId,
      (comment) => setComments((prev) => appendComment(prev, comment)),
      (commentId) => setComments((prev) => prev.filter((c) => c.id !== commentId)),
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
  }, [projectId, fileId, onSessionLost]);

  useEffect(() => {
    if (liveConnected) return;
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, [liveConnected, load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canComment || !draft.trim()) return;
    setSending(true);
    try {
      const created = await addSpaceworkFileComment(projectId, fileId, draft.trim());
      setDraft("");
      setComments((prev) => appendComment(prev, created));
    } catch (err) {
      handleErr(err);
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(commentId: number) {
    try {
      await deleteSpaceworkFileComment(projectId, fileId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      handleErr(err);
    }
  }

  return (
    <section className="spacework-file-comments" aria-label="Comentarios del archivo">
      <header className="spacework-file-comments__head">
        <h3>
          Comentarios
          {liveConnected ? <SpaceworkLiveBadge /> : null}
        </h3>
        <span className="muted">{comments.length}</span>
      </header>

      <div className="spacework-file-comments__list" aria-live="polite">
        {loading && comments.length === 0 ? (
          <p className="muted pad-sm">Cargando…</p>
        ) : comments.length === 0 ? (
          <p className="muted pad-sm">Sin comentarios todavía.</p>
        ) : (
          comments.map((c) => {
            const canDelete =
              c.authorUsername === sessionUsername || myRole === "OWNER" || myRole === "ADMIN";
            return (
              <article key={c.id} className="spacework-file-comment">
                <header className="spacework-file-comment__head">
                  <SpaceworkAvatar name={c.authorUsername} size="sm" />
                  <strong>{c.authorUsername}</strong>
                  <time dateTime={c.createdAt}>{formatDateCompact(c.createdAt)}</time>
                  {canDelete && (
                    <button
                      type="button"
                      className="btn ghost sm danger"
                      onClick={() => void handleDelete(c.id)}
                    >
                      Borrar
                    </button>
                  )}
                </header>
                <p className="spacework-file-comment__body">{c.content}</p>
              </article>
            );
          })
        )}
      </div>

      {canComment ? (
        <form className="spacework-file-comments__compose" onSubmit={(e) => void handleSubmit(e)}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Comentario sobre este archivo…"
            rows={2}
            maxLength={2000}
          />
          <button type="submit" className="btn primary sm" disabled={sending || !draft.trim()}>
            {sending ? "…" : "Comentar"}
          </button>
        </form>
      ) : (
        <p className="muted pad-sm">Solo lectura: no puedes comentar.</p>
      )}
    </section>
  );
}
