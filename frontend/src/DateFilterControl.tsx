import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DateCalendarPopover from "./DateCalendarPopover";
import { addDays, sameDay, todayStart } from "./dateUtils";

type Props = {
  selected: Date;
  onSelect: (d: Date) => void;
  onDisable: () => void;
  daysWithFiles?: string[];
  onVisibleMonthChange?: (yearMonth: string) => void;
};

function formatDayLabel(d: Date): string {
  const raw = d.toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return raw.replace(/\./g, "").replace(/,\s*/g, ", ");
}

export default function DateFilterControl({
  selected,
  onSelect,
  onDisable,
  daysWithFiles = [],
  onVisibleMonthChange,
}: Props) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const label = formatDayLabel(selected);
  const isToday = sameDay(selected, todayStart());

  useLayoutEffect(() => {
    if (!calendarOpen || !dateButtonRef.current) {
      setPanelPos(null);
      return;
    }
    const rect = dateButtonRef.current.getBoundingClientRect();
    const panelW = 280;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - panelW - 8));
    setPanelPos({ top: rect.bottom + 6, left });
  }, [calendarOpen, selected]);

  useEffect(() => {
    if (!calendarOpen) return;
    function close(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setCalendarOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCalendarOpen(false);
    }
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [calendarOpen]);

  return (
    <div className="date-filter-control" ref={rootRef}>
      <div className="date-filter-control__nav" role="group" aria-label="Filtrar por día">
        <button
          type="button"
          className="date-filter-control__step"
          onClick={() => onSelect(addDays(selected, -1))}
          aria-label="Día anterior"
        >
          ‹
        </button>
        <button
          ref={dateButtonRef}
          type="button"
          className={`date-filter-control__date${calendarOpen ? " is-open" : ""}`}
          onClick={() => setCalendarOpen((open) => !open)}
          aria-expanded={calendarOpen}
          aria-haspopup="dialog"
          title="Abrir calendario"
        >
          {isToday ? "Hoy" : label}
        </button>
        <button
          type="button"
          className="date-filter-control__step"
          onClick={() => onSelect(addDays(selected, 1))}
          aria-label="Día siguiente"
        >
          ›
        </button>
        <button
          type="button"
          className="date-filter-control__clear"
          onClick={onDisable}
          aria-label="Quitar filtro de fecha"
          title="Quitar filtro"
        >
          ×
        </button>
      </div>
      {calendarOpen && panelPos
        ? createPortal(
            <DateCalendarPopover
              panelRef={panelRef}
              className="date-calendar-popover--floating"
              style={{ top: panelPos.top, left: panelPos.left }}
              selected={selected}
              onSelect={(d) => {
                onSelect(d);
                setCalendarOpen(false);
              }}
              daysWithFiles={daysWithFiles}
              onVisibleMonthChange={onVisibleMonthChange}
            />,
            document.body,
          )
        : null}
    </div>
  );
}
