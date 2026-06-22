import { forwardRef, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { parseQuickTask } from "./lifeQuickParse";

type Props = {
  onAdd: (title: string, dueAt: Date | null, tags: string[]) => Promise<void> | void;
  busy?: boolean;
  placeholder?: string;
};

function dueKind(d: Date, now: Date): "overdue" | "today" | "soon" {
  const a = new Date(d); a.setHours(0, 0, 0, 0);
  const b = new Date(now); b.setHours(0, 0, 0, 0);
  if (d.getTime() < now.getTime() && a.getTime() < b.getTime()) return "overdue";
  if (a.getTime() === b.getTime()) return "today";
  return "soon";
}

function fmtDue(d: Date, now: Date): string {
  const a = new Date(d); a.setHours(0, 0, 0, 0);
  const b = new Date(now); b.setHours(0, 0, 0, 0);
  const days = Math.round((a.getTime() - b.getTime()) / 86400000);
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  const time = hasTime
    ? " · " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
    : "";
  if (days === 0) return "Hoy" + time;
  if (days === 1) return "Mañana" + time;
  if (days === -1) return "Ayer" + time;
  const date = d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
  return date.charAt(0).toUpperCase() + date.slice(1) + time;
}

/** Barra de captura "una línea = una tarea". Parsea fecha y #tags al vuelo. */
const QuickAddBar = forwardRef<HTMLInputElement, Props>(function QuickAddBar(
  { onAdd, busy, placeholder },
  ref,
) {
  const [text, setText] = useState("");
  const now = useMemo(() => new Date(), [text]); // refresca al teclear
  const parsed = useMemo(() => (text.trim() ? parseQuickTask(text, now) : null), [text, now]);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!parsed || !parsed.title.trim() || busy) return;
    await onAdd(parsed.title.trim(), parsed.dueAt, parsed.tags);
    setText("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (text) {
        setText("");
        e.stopPropagation();
      } else {
        (e.target as HTMLInputElement).blur();
      }
    }
  }

  return (
    <form className="life-quickadd" onSubmit={(e) => void submit(e)}>
      <span className="life-quickadd__plus" aria-hidden>
        +
      </span>
      <input
        ref={ref}
        type="text"
        className="life-quickadd__input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder ?? "Añade un compromiso… «pagar luz mañana 9am #casa»"}
        aria-label="Captura rápida de tarea"
        enterKeyHint="done"
      />
      {parsed && (parsed.dueAt || parsed.tags.length > 0) && (
        <span className="life-quickadd__chips" aria-hidden>
          {parsed.dueAt && (
            <span className={`life-quickadd__chip life-quickadd__chip--${dueKind(parsed.dueAt, now)}`}>
              {fmtDue(parsed.dueAt, now)}
            </span>
          )}
          {parsed.tags.map((t) => (
            <span key={t} className="life-quickadd__chip life-quickadd__chip--tag">
              #{t}
            </span>
          ))}
        </span>
      )}
      <kbd className="life-quickadd__hint">↵</kbd>
    </form>
  );
});

export default QuickAddBar;
