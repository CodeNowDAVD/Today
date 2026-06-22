import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { globalSearch, SearchHit, SearchHitKind } from "./api";

const LIFE_KINDS = new Set<SearchHitKind>(["LIFE_TASK", "INBOX_ITEM", "CONTACT"]);

function searchSectionKey(kind: SearchHitKind): string {
  return LIFE_KINDS.has(kind) ? "LIFE" : kind;
}

const SECTION_LABELS: Record<string, string> = {
  FILE: "Archivos",
  LINK: "Enlaces",
  PROJECT: "Proyectos",
  WIKI: "Wiki",
  TASK: "Tareas",
  LIFE: "Vida personal",
};

const HIT_LABELS: Partial<Record<SearchHitKind, string>> = {
  LIFE_TASK: "Tarea",
  INBOX_ITEM: "Captura",
  CONTACT: "Persona",
};

export type Command = {
  id: string;
  label: string;
  /** sección de agrupación, ej. "Ir a" / "Acciones" */
  section: string;
  /** texto extra para el filtro (sinónimos) */
  keywords?: string;
  /** pista a la derecha (atajo o estado) */
  hint?: string;
  run: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onNavigate: (hit: SearchHit) => void;
  commands?: Command[];
};

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default function GlobalSearchDialog({ open, onClose, onNavigate, commands = [] }: Props) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchGen = useRef(0);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setHits([]);
      setSearchError(null);
      return;
    }
    const gen = ++fetchGen.current;
    setLoading(true);
    setSearchError(null);
    try {
      const res = await globalSearch(trimmed);
      if (fetchGen.current !== gen) return;
      setHits(res.hits);
    } catch (err) {
      if (fetchGen.current !== gen) return;
      setHits([]);
      setSearchError(err instanceof Error ? err.message : "No se pudo buscar");
    } finally {
      if (fetchGen.current === gen) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHits([]);
    setSearchError(null);
    setActiveIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void runSearch(query), 280);
    return () => window.clearTimeout(timer);
  }, [open, query, runSearch]);

  // comandos filtrados por el texto
  const matchedCommands = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return commands;
    return commands.filter((c) => norm(`${c.label} ${c.keywords ?? ""} ${c.section}`).includes(q));
  }, [commands, query]);

  // lista plana para navegación con teclado: comandos primero, luego resultados
  const flat = useMemo(
    () => [
      ...matchedCommands.map((cmd) => ({ kind: "cmd" as const, cmd })),
      ...hits.map((hit) => ({ kind: "hit" as const, hit })),
    ],
    [matchedCommands, hits],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query, hits.length, matchedCommands.length]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (flat.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = flat[activeIndex];
        if (!item) return;
        if (item.kind === "cmd") item.cmd.run();
        else onNavigate(item.hit);
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flat, activeIndex, onNavigate, onClose]);

  if (!open) return null;

  const q = query.trim();
  const grouped = hits.reduce<Record<string, SearchHit[]>>((acc, hit) => {
    const key = searchSectionKey(hit.kind);
    (acc[key] ??= []).push(hit);
    return acc;
  }, {});
  const sectionOrder = ["FILE", "LINK", "PROJECT", "WIKI", "TASK", "LIFE"];
  const orderedSections = sectionOrder.filter((k) => grouped[k]?.length);

  // comandos agrupados por sección, preservando orden de aparición
  const cmdSections: { name: string; items: Command[] }[] = [];
  for (const c of matchedCommands) {
    let s = cmdSections.find((x) => x.name === c.section);
    if (!s) {
      s = { name: c.section, items: [] };
      cmdSections.push(s);
    }
    s.items.push(c);
  }
  const cmdCount = matchedCommands.length;

  const nothing =
    flat.length === 0 && !loading && (q.length < 2 ? true : hits.length === 0 && cmdCount === 0);

  return (
    <div className="global-search-backdrop" role="presentation" onClick={onClose}>
      <div
        className="global-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="global-search-input"
          type="search"
          placeholder="Escribe un comando o busca archivos, enlaces, tareas…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="global-search-results" role="listbox">
          {/* —— comandos —— */}
          {cmdSections.map((sec) => (
            <section key={`cmd-${sec.name}`} className="global-search-group">
              <h3 className="global-search-group__title">{sec.name}</h3>
              <ul className="global-search-group__list">
                {sec.items.map((cmd) => {
                  const index = matchedCommands.indexOf(cmd);
                  return (
                    <li key={cmd.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={index === activeIndex}
                        className={[
                          "global-search-hit",
                          "global-search-cmd",
                          index === activeIndex && "global-search-hit--active",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => {
                          cmd.run();
                          onClose();
                        }}
                      >
                        <span className="global-search-hit__title">{cmd.label}</span>
                        {cmd.hint ? <span className="global-search-cmd__hint">{cmd.hint}</span> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {/* —— resultados de búsqueda —— */}
          {loading ? (
            <p className="global-search-empty muted">Buscando…</p>
          ) : searchError ? (
            <p className="global-search-empty alert error">{searchError}</p>
          ) : nothing ? (
            <p className="global-search-empty muted">
              {q.length < 2 ? "Escribe para buscar contenido" : "Sin resultados"}
            </p>
          ) : (
            orderedSections.map((sectionKey) => {
              const rows = grouped[sectionKey] ?? [];
              return (
                <section key={sectionKey} className="global-search-group">
                  <h3 className="global-search-group__title">{SECTION_LABELS[sectionKey] ?? sectionKey}</h3>
                  <ul className="global-search-group__list">
                    {rows.map((hit) => {
                      const index = cmdCount + hits.indexOf(hit);
                      const kindLabel = HIT_LABELS[hit.kind];
                      return (
                        <li key={`${hit.kind}-${hit.id}`}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={index === activeIndex}
                            className={[
                              "global-search-hit",
                              index === activeIndex && "global-search-hit--active",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => {
                              onNavigate(hit);
                              onClose();
                            }}
                          >
                            <span className="global-search-hit__title">
                              {kindLabel ? (
                                <span className="global-search-hit__kind muted">{kindLabel} · </span>
                              ) : null}
                              {hit.title}
                            </span>
                            {hit.subtitle ? (
                              <span className="global-search-hit__subtitle muted">{hit.subtitle}</span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })
          )}
        </div>
        <footer className="global-search-footer muted">
          <span>↑↓ navegar</span>
          <span>↵ ejecutar</span>
          <span>esc cerrar</span>
        </footer>
      </div>
    </div>
  );
}
