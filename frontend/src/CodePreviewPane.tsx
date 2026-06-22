import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Minus,
  Plus,
  Search,
  WrapText,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { highlightCodeLines } from "./codeHighlight";
import { getCodeLanguage } from "./codeLanguages";
import { getCodeLanguageTheme } from "./codeLanguageTheme";
import { selectPlainTextContent, usePreviewSelectAll } from "./usePreviewSelectAll";

type Props = {
  content: string;
  fileName: string;
  contentType?: string;
  truncated?: boolean;
};

const FONT_MIN = 11;
const FONT_MAX = 18;
const FONT_DEFAULT = 13;

function formatChars(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10_000 ? 0 : 1)}k`;
  return count.toLocaleString("es");
}

export default function CodePreviewPane({ content, fileName, contentType, truncated }: Props) {
  const [lines, setLines] = useState<string[]>([]);
  const [lineCount, setLineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wrap, setWrap] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedLine, setCopiedLine] = useState<number | null>(null);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState(FONT_DEFAULT);
  const [search, setSearch] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [goToLine, setGoToLine] = useState("");

  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const rootRef = useRef<HTMLDivElement>(null);

  const lang = useMemo(() => getCodeLanguage(fileName, contentType), [fileName, contentType]);
  const theme = useMemo(() => getCodeLanguageTheme(lang.id, fileName), [lang.id, fileName]);
  const sourceLines = useMemo(() => (content === "" ? [""] : content.split("\n")), [content]);

  const themeStyle = useMemo(
    () =>
      ({
        "--code-accent": theme.accent,
        "--code-font-size": `${fontSize}px`,
        "--hl-keyword": theme.keyword,
        "--hl-string": theme.string,
        "--hl-number": theme.number,
        "--hl-function": theme.function,
      }) as CSSProperties,
    [theme, fontSize],
  );

  const matchLines = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return sourceLines.reduce<number[]>((acc, line, index) => {
      if (line.toLowerCase().includes(query)) acc.push(index + 1);
      return acc;
    }, []);
  }, [sourceLines, search]);

  useEffect(() => {
    if (matchIndex >= matchLines.length) setMatchIndex(0);
  }, [matchLines, matchIndex]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    highlightCodeLines(content, lang.id)
      .then((result) => {
        if (cancelled) return;
        setLines(result.lines);
        setLineCount(result.lineCount);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "No se pudo resaltar el código");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [content, lang.id]);

  const scrollToLine = useCallback((lineNo: number) => {
    rowRefs.current.get(lineNo)?.scrollIntoView({ block: "center", behavior: "smooth" });
    setActiveLine(lineNo);
  }, []);

  useEffect(() => {
    if (matchLines.length === 0) return;
    scrollToLine(matchLines[matchIndex] ?? matchLines[0]);
  }, [matchIndex, matchLines, scrollToLine]);

  const onCopyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedAll(true);
      window.setTimeout(() => setCopiedAll(false), 1800);
    } catch {
      /* clipboard no disponible */
    }
  }, [content]);

  const onCopyLine = useCallback(async (lineNo: number) => {
    try {
      await navigator.clipboard.writeText(sourceLines[lineNo - 1] ?? "");
      setCopiedLine(lineNo);
      window.setTimeout(() => setCopiedLine(null), 1400);
    } catch {
      /* clipboard no disponible */
    }
  }, [sourceLines]);

  const onGoToLine = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      const parsed = Number.parseInt(goToLine, 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > lineCount) return;
      scrollToLine(parsed);
    },
    [goToLine, lineCount, scrollToLine],
  );

  const goPrevMatch = () => {
    if (matchLines.length === 0) return;
    setMatchIndex((index) => (index - 1 + matchLines.length) % matchLines.length);
  };

  const goNextMatch = () => {
    if (matchLines.length === 0) return;
    setMatchIndex((index) => (index + 1) % matchLines.length);
  };

  const activeLineText = activeLine != null ? sourceLines[activeLine - 1] ?? "" : "";
  const activeLineLength = activeLineText.length;

  const onSelectAll = useCallback(() => {
    if (rootRef.current) selectPlainTextContent(content, rootRef.current);
  }, [content]);

  const { focusRoot } = usePreviewSelectAll({
    rootRef,
    enabled: !loading && !error,
    onSelectAll,
  });

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onMouseDownCapture={(event) => focusRoot(event.target)}
      className={[
        "code-preview",
        "preview-select-root",
        `code-preview--lang-${lang.id}`,
        wrap && "code-preview--wrap",
      ]
        .filter(Boolean)
        .join(" ")}
      style={themeStyle}
    >
      <div className="code-preview__toolbar">
        <label className="code-preview__search">
          <Search size={14} strokeWidth={2} aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setMatchIndex(0);
            }}
            placeholder="Buscar en el archivo…"
            aria-label="Buscar en el archivo"
          />
        </label>

        {search.trim() && (
          <div className="code-preview__matches">
            <span>{matchLines.length === 0 ? "0" : matchIndex + 1}/{matchLines.length || 0}</span>
            <button type="button" className="code-preview__icon-btn" onClick={goPrevMatch} disabled={matchLines.length === 0} title="Coincidencia anterior" aria-label="Coincidencia anterior">
              <ChevronUp size={14} strokeWidth={2.2} />
            </button>
            <button type="button" className="code-preview__icon-btn" onClick={goNextMatch} disabled={matchLines.length === 0} title="Siguiente coincidencia" aria-label="Siguiente coincidencia">
              <ChevronDown size={14} strokeWidth={2.2} />
            </button>
          </div>
        )}

        <form className="code-preview__goto" onSubmit={onGoToLine}>
          <span>Línea</span>
          <input
            type="text"
            inputMode="numeric"
            value={goToLine}
            onChange={(event) => setGoToLine(event.target.value.replace(/\D/g, ""))}
            placeholder="1"
            aria-label="Ir a línea"
          />
        </form>

        <div className="code-preview__font">
          <button
            type="button"
            className="code-preview__icon-btn"
            onClick={() => setFontSize((size) => Math.max(FONT_MIN, size - 1))}
            disabled={fontSize <= FONT_MIN}
            title="Reducir fuente"
            aria-label="Reducir fuente"
          >
            <Minus size={14} strokeWidth={2.2} />
          </button>
          <span>{fontSize}px</span>
          <button
            type="button"
            className="code-preview__icon-btn"
            onClick={() => setFontSize((size) => Math.min(FONT_MAX, size + 1))}
            disabled={fontSize >= FONT_MAX}
            title="Aumentar fuente"
            aria-label="Aumentar fuente"
          >
            <Plus size={14} strokeWidth={2.2} />
          </button>
        </div>

        <button
          type="button"
          className="code-preview__tool"
          onClick={() => setWrap((value) => !value)}
          aria-pressed={wrap}
          title={wrap ? "Desactivar ajuste de línea" : "Ajustar líneas largas"}
        >
          <WrapText size={14} strokeWidth={2} aria-hidden />
          <span>Ajuste</span>
        </button>

        <button type="button" className="code-preview__tool" onClick={onCopyAll} title="Copiar todo el archivo">
          {copiedAll ? <Check size={14} strokeWidth={2.5} aria-hidden /> : <Copy size={14} strokeWidth={2} aria-hidden />}
          <span>{copiedAll ? "Copiado" : "Copiar"}</span>
        </button>
      </div>

      <div className="code-preview__viewport">
        {loading && <p className="code-preview__status">Cargando código…</p>}
        {error && <p className="code-preview__status code-preview__status--error">{error}</p>}

        {!loading && !error && (
          <div className="code-preview__block">
            {lines.map((html, index) => {
              const lineNo = index + 1;
              const isActive = activeLine === lineNo;
              const isMatch = matchLines.includes(lineNo);
              const isCurrentMatch = matchLines.length > 0 && matchLines[matchIndex] === lineNo;

              return (
                <div
                  key={lineNo}
                  ref={(node) => {
                    if (node) rowRefs.current.set(lineNo, node);
                    else rowRefs.current.delete(lineNo);
                  }}
                  className={[
                    "code-preview__row",
                    isActive && "code-preview__row--active",
                    isMatch && "code-preview__row--match",
                    isCurrentMatch && "code-preview__row--match-current",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setActiveLine(lineNo)}
                >
                  <button
                    type="button"
                    className={["code-preview__ln", copiedLine === lineNo && "code-preview__ln--copied"].filter(Boolean).join(" ")}
                    onClick={(event) => {
                      event.stopPropagation();
                      onCopyLine(lineNo);
                    }}
                    title="Copiar esta línea"
                    aria-label={`Copiar línea ${lineNo}`}
                  >
                    {copiedLine === lineNo ? <Check size={11} strokeWidth={2.5} aria-hidden /> : lineNo}
                  </button>
                  <span className="code-preview__line hljs" dangerouslySetInnerHTML={{ __html: html }} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="code-preview__footer">
        <span className="code-preview__footer-item code-preview__footer-item--accent">{lang.label}</span>
        {truncated && <span className="code-preview__footer-item code-preview__footer-item--warn">Vista parcial</span>}
        <span className="code-preview__footer-item">
          {lineCount.toLocaleString("es")} {lineCount === 1 ? "línea" : "líneas"}
        </span>
        <span className="code-preview__footer-item">{formatChars(content.length)} caracteres</span>
        {activeLine != null && (
          <span className="code-preview__footer-item code-preview__footer-item--focus">
            Línea {activeLine} · {activeLineLength} caracteres
          </span>
        )}
      </footer>
    </div>
  );
}
