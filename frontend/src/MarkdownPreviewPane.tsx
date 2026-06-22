import { Check, Copy, Eye, FileCode2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { PluggableList } from "unified";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { createMarkdownPreviewComponents } from "./markdownPreviewComponents";
import { selectElementContents, selectPlainTextContent, usePreviewSelectAll } from "./usePreviewSelectAll";

type Props = {
  content: string;
  fileName: string;
  truncated?: boolean;
};

type ViewMode = "rendered" | "source";

export default function MarkdownPreviewPane({ content, fileName, truncated }: Props) {
  const [view, setView] = useState<ViewMode>("rendered");
  const [copied, setCopied] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const sourceRef = useRef<HTMLPreElement>(null);

  const components = useMemo(() => createMarkdownPreviewComponents(), []);
  const rehypePlugins: PluggableList = useMemo(
    () => [rehypeSlug, [rehypeAutolinkHeadings, { behavior: "wrap" }]],
    [],
  );

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard no disponible */
    }
  }, [content]);

  const onSelectAll = useCallback(() => {
    if (view === "source" && sourceRef.current) {
      selectElementContents(sourceRef.current);
      return;
    }
    if (articleRef.current) {
      selectElementContents(articleRef.current);
      return;
    }
    if (rootRef.current) selectPlainTextContent(content, rootRef.current);
  }, [content, view]);

  const { focusRoot } = usePreviewSelectAll({ rootRef, onSelectAll });

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onMouseDownCapture={(event) => focusRoot(event.target)}
      className="md-preview preview-select-root"
    >
      <div className="md-preview__toolbar">
        <div className="md-preview__tabs" role="tablist" aria-label="Vista del Markdown">
          <button
            type="button"
            role="tab"
            className="md-preview__tab"
            aria-selected={view === "rendered"}
            onClick={() => setView("rendered")}
          >
            <Eye size={14} strokeWidth={2} aria-hidden />
            Vista previa
          </button>
          <button
            type="button"
            role="tab"
            className="md-preview__tab"
            aria-selected={view === "source"}
            onClick={() => setView("source")}
          >
            <FileCode2 size={14} strokeWidth={2} aria-hidden />
            Fuente
          </button>
        </div>
        {truncated && <span className="md-preview__chip">Vista parcial</span>}
        <button type="button" className="md-preview__copy" onClick={onCopy} title="Copiar Markdown">
          {copied ? <Check size={14} strokeWidth={2.5} aria-hidden /> : <Copy size={14} strokeWidth={2} aria-hidden />}
          <span>{copied ? "Copiado" : "Copiar"}</span>
        </button>
      </div>

      <div className="md-preview__body">
        {view === "rendered" ? (
          <article ref={articleRef} className="markdown-body md-preview__article">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={rehypePlugins} components={components}>
              {content}
            </ReactMarkdown>
          </article>
        ) : (
          <pre ref={sourceRef} className="md-preview__source">
            {content}
          </pre>
        )}
      </div>

      <footer className="md-preview__footer">
        <span>{fileName.split("/").pop()}</span>
        <span>{content.split("\n").length} líneas</span>
      </footer>
    </div>
  );
}
