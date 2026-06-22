import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  sameDay,
  startOfDay,
  startOfMonth,
  toDayString,
  toYearMonth,
  todayStart,
} from "./dateUtils";

const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const DAYS_SHORT = ["D", "L", "M", "M", "J", "V", "S"];

type Props = {
  selected: Date;
  onSelect: (d: Date) => void;
  daysWithFiles?: string[];
  onVisibleMonthChange?: (yearMonth: string) => void;
  className?: string;
  style?: React.CSSProperties;
  panelRef?: React.Ref<HTMLDivElement>;
};

function calendarCells(viewMonth: Date): (Date | null)[] {
  const first = startOfMonth(viewMonth);
  const pad = first.getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: pad }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(startOfDay(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function DateCalendarPopover({
  selected,
  onSelect,
  daysWithFiles = [],
  onVisibleMonthChange,
  className,
  style,
  panelRef,
}: Props) {
  const today = useMemo(() => todayStart(), []);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected));
  const daysSet = useMemo(() => new Set(daysWithFiles), [daysWithFiles]);
  const cells = useMemo(() => calendarCells(viewMonth), [viewMonth]);

  useEffect(() => {
    setViewMonth(startOfMonth(selected));
  }, [selected]);

  useEffect(() => {
    onVisibleMonthChange?.(toYearMonth(viewMonth));
  }, [viewMonth, onVisibleMonthChange]);

  function shiftMonth(delta: number) {
    setViewMonth((current) =>
      startOfMonth(new Date(current.getFullYear(), current.getMonth() + delta, 1)),
    );
  }

  return (
    <div
      ref={panelRef}
      className={["date-calendar-popover", className].filter(Boolean).join(" ")}
      style={style}
      role="dialog"
      aria-label="Elegir día"
    >
      <div className="date-calendar-popover__head">
        <button
          type="button"
          className="date-calendar-popover__nav"
          onClick={() => shiftMonth(-1)}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <span className="date-calendar-popover__month">
          {MONTHS_ES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </span>
        <button
          type="button"
          className="date-calendar-popover__nav"
          onClick={() => shiftMonth(1)}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>
      <div className="date-calendar-popover__dow-row" aria-hidden>
        {DAYS_SHORT.map((label, i) => (
          <span key={`${label}-${i}`} className="date-calendar-popover__dow">
            {label}
          </span>
        ))}
      </div>
      <div className="date-calendar-popover__grid" role="listbox" aria-label="Días del mes">
        {cells.map((date, i) => {
          if (!date) {
            return <span key={`empty-${i}`} className="date-calendar-popover__cell is-empty" />;
          }
          const key = toDayString(date);
          const isSelected = sameDay(date, selected);
          const isToday = sameDay(date, today);
          const hasFiles = daysSet.has(key);
          return (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={isSelected}
              className={[
                "date-calendar-popover__cell",
                isSelected && "is-selected",
                isToday && "is-today",
                hasFiles && "has-files",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelect(date)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
      {!sameDay(selected, today) && (
        <div className="date-calendar-popover__foot">
          <button type="button" className="date-calendar-popover__today" onClick={() => onSelect(today)}>
            Ir a hoy
          </button>
        </div>
      )}
    </div>
  );
}
