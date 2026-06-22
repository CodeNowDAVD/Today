import { Eye, FilePenLine, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { PluggableList } from "unified";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { fetchFileBlob, replaceFileContent, type FileItem } from "./api";
import { createMarkdownPreviewComponents } from "./markdownPreviewComponents";
import { plainTextToMarkdown } from "./textNote/plainTextToMarkdown";

type Props = {
  file: FileItem;
  canEdit: boolean;
  onSaved: (file: FileItem) => void;
  onError: (message: string) => void;
};

type ViewMode = "preview" | "edit";

export default function TextNotePane({ file, canEdit, onSaved, onError }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [view, setView] = useState<ViewMode>("preview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const blob = await fetchFileBlob(file.id, true);
      const text = await blob.text();
      setContent(text);
      setDraft(text);
    } catch (e) {
      onError(e instanceof Error ? e.message : "No se pudo cargar el texto");
    } finally {
      setLoading(false);
    }
  }, [file.id, onError]);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  useEffect(() => {
    if (view === "edit") editRef.current?.focus();
  }, [view]);

  const markdownPreview = useMemo(
    () => plainTextToMarkdown(draft ?? ""),
    [draft],
  );

  const components = useMemo(() => createMarkdownPreviewComponents(), []);
  const rehypePlugins: PluggableList = useMemo(
    () => [rehypeSlug, [rehypeAutolinkHeadings, { behavior: "wrap" }]],
    [],
  );

  const persistContent = useCallback(
    async (nextContent: string) => {
      setSaving(true);
      try {
        const blob = new Blob([nextContent], { type: "text/plain;charset=utf-8" });
        const updated = await replaceFileContent(
          file.id,
          new File([blob], file.originalName, { type: "text/plain;charset=utf-8" }),
        );
        setContent(nextContent);
        setDraft(nextContent);
        onSaved(updated);
      } catch (e) {
        onError(e instanceof Error ? e.message : "No se pudo guardar");
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [file.id, file.originalName, onError, onSaved],
  );

  const handleSaveEdit = useCallback(async () => {
    if (saving || !canEdit) return;
    try {
      await persistContent(draft);
      setView("preview");
    } catch {
      /* onError */
    }
  }, [canEdit, draft, persistContent, saving]);

  if (loading) {
    return <p className="files-preview-status">Cargando nota…</p>;
  }

  return (
    <div className="text-note-pane">
      <div className="text-note-pane__toolbar">
        <div className="text-note-pane__tabs" role="tablist" aria-label="Vista de la nota">
          <button
            type="button"
            role="tab"
            className="text-note-pane__tab"
            aria-selected={view === "preview"}
            onClick={() => setView("preview")}
          >
            <Eye size={14} strokeWidth={2} aria-hidden />
            Vista previa
          </button>
          {canEdit && (
            <button
              type="button"
              role="tab"
              className="text-note-pane__tab"
              aria-selected={view === "edit"}
              onClick={() => setView("edit")}
            >
              <FilePenLine size={14} strokeWidth={2} aria-hidden />
              Editar
            </button>
          )}
        </div>
        {view === "edit" && canEdit && (
          <button
            type="button"
            className="text-note-pane__save"
            onClick={() => void handleSaveEdit()}
            disabled={saving || draft === content}
          >
            <Save size={14} strokeWidth={2} aria-hidden />
            {saving ? "Guardando…" : "Guardar"}
          </button>
        )}
      </div>

      <div className="text-note-pane__body">
        {view === "preview" ? (
          <article className="markdown-body text-note-pane__article">
            {markdownPreview.trim() ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={rehypePlugins}
                components={components}
              >
                {markdownPreview}
              </ReactMarkdown>
            ) : (
              <p className="text-note-pane__empty">Nota vacía. Pulsa Editar para escribir.</p>
            )}
          </article>
        ) : (
          <textarea
            ref={editRef}
            className="text-note-pane__editor"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe aquí. La vista previa lo mostrará como Markdown."
            spellCheck
          />
        )}
      </div>
    </div>
  );
}
