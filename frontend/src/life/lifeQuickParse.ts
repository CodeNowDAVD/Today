/**
 * Parser de captura rápida — convierte una línea en {title, dueAt, tags}.
 * Español primero, con atajos en inglés. Sin dependencias.
 *
 *   "Pagar luz mañana 9am #casa"  → { title:"Pagar luz", dueAt: <mañana 09:00>, tags:["casa"] }
 *   "Reunión viernes 10:00"        → { title:"Reunión", dueAt: <próx viernes 10:00>, tags:[] }
 *   "Llamar a Ana en 3 días"       → { title:"Llamar a Ana", dueAt:<hoy+3 09:00>, tags:[] }
 */

export type QuickParseResult = {
  title: string;
  dueAt: Date | null;
  tags: string[];
  /** texto reconocido como fecha (para resaltar/preview) */
  dueSourceText: string | null;
};

const DEFAULT_HOUR = 9; // si hay fecha pero no hora

const WEEKDAYS: Record<string, number> = {
  domingo: 0, dom: 0,
  lunes: 1, lun: 1,
  martes: 2, mar: 2,
  miercoles: 3, "miércoles": 3, mie: 3, "mié": 3,
  jueves: 4, jue: 4,
  viernes: 5, vie: 5,
  sabado: 6, "sábado": 6, sab: 6, "sáb": 6,
};

const MONTHS: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9,
  noviembre: 10, diciembre: 11,
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6,
  ago: 7, sep: 8, set: 8, oct: 9, nov: 10, dic: 11,
};

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function atHour(d: Date, hour: number, minute: number): Date {
  const c = new Date(d);
  c.setHours(hour, minute, 0, 0);
  return c;
}

/** Próxima ocurrencia de un día de semana (incluye hoy solo si forceNext=false y aún no pasó). */
function nextWeekday(now: Date, target: number, forceNextWeek: boolean): Date {
  const base = startOfDay(now);
  let delta = (target - base.getDay() + 7) % 7;
  if (delta === 0) delta = forceNextWeek ? 7 : 0;
  if (delta === 0 && forceNextWeek) delta = 7;
  if (delta === 0 && !forceNextWeek) delta = 7; // "viernes" = el próximo, no hoy
  const r = new Date(base);
  r.setDate(base.getDate() + delta);
  return r;
}

type Match = { start: number; end: number };

/**
 * Parsea la entrada. `now` inyectable para pruebas.
 */
export function parseQuickTask(input: string, now: Date = new Date()): QuickParseResult {
  const tags: string[] = [];
  const removals: Match[] = [];
  const raw = input;
  const lower = stripAccents(raw.toLowerCase());

  // ---- tags (#algo) ----
  const tagRe = /#([\p{L}\d_][\p{L}\d_-]*)/gu;
  for (const m of raw.matchAll(tagRe)) {
    tags.push(m[1]!.toLowerCase());
    removals.push({ start: m.index!, end: m.index! + m[0].length });
  }

  // ---- hora ----
  let timeHour: number | null = null;
  let timeMin = 0;
  // 9am / 9 am / 9:30pm / 12am
  const ampmRe = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.?m\.?|p\.?m\.?)\b/i;
  // 24h: 10:00 / 9:30 / 21h / 21 h / "a las 9" / "a las 21:30"
  const h24Re = /\b(?:a\s+las\s+)?(\d{1,2})(?::(\d{2}))?\s*(?:h|hrs|horas)?\b/i;
  const alasRe = /\ba\s+las\s+(\d{1,2})(?::(\d{2}))?\b/i;

  const am = lower.match(ampmRe);
  if (am) {
    let h = Number(am[1]);
    const mn = am[2] ? Number(am[2]) : 0;
    const isPm = /p/i.test(am[3]!);
    if (h === 12) h = isPm ? 12 : 0;
    else if (isPm) h += 12;
    timeHour = h;
    timeMin = mn;
    removals.push({ start: am.index!, end: am.index! + am[0].length });
  } else {
    const al = lower.match(alasRe);
    const hh = al ?? lower.match(/\b(\d{1,2}):(\d{2})\b/) ?? lower.match(/\b(\d{1,2})\s*(?:h|hrs|horas)\b/i);
    if (hh) {
      const h = Number(hh[1]);
      const mn = hh[2] ? Number(hh[2]) : 0;
      if (h >= 0 && h <= 23 && mn >= 0 && mn <= 59) {
        timeHour = h;
        timeMin = mn;
        removals.push({ start: hh.index!, end: hh.index! + hh[0].length });
      }
    }
  }

  // ---- fecha ----
  let dueDay: Date | null = null;
  let dueText: string | null = null;
  const mark = (m: RegExpMatchArray, day: Date) => {
    dueDay = day;
    dueText = raw.slice(m.index!, m.index! + m[0].length).trim();
    removals.push({ start: m.index!, end: m.index! + m[0].length });
  };

  // orden importa: frases largas primero
  let m: RegExpMatchArray | null;
  if ((m = lower.match(/\bpasado\s+manana\b/))) {
    const d = startOfDay(now); d.setDate(d.getDate() + 2); mark(m, d);
  } else if ((m = lower.match(/\bmanana\b/))) {
    const d = startOfDay(now); d.setDate(d.getDate() + 1); mark(m, d);
  } else if ((m = lower.match(/\bhoy\b/))) {
    mark(m, startOfDay(now));
  } else if ((m = lower.match(/\ben\s+(\d{1,3})\s+(dias?|semanas?|meses|mes)\b/))) {
    const n = Number(m[1]);
    const unit = m[2]!;
    const d = startOfDay(now);
    if (unit.startsWith("dia")) d.setDate(d.getDate() + n);
    else if (unit.startsWith("semana")) d.setDate(d.getDate() + n * 7);
    else d.setMonth(d.getMonth() + n);
    mark(m, d);
  } else if ((m = lower.match(/\b(prox(?:imo)?|este|el)?\s*(domingo|lunes|martes|miercoles|jueves|viernes|sabado|dom|lun|mar|mie|jue|vie|sab)\b/))) {
    // evitar capturar "mar" dentro de "marzo": el \b ya lo cubre
    const forceNext = Boolean(m[1] && /prox/.test(m[1]));
    const wd = WEEKDAYS[m[2]!]!;
    mark(m, nextWeekday(now, wd, forceNext));
  } else if ((m = lower.match(/\b(\d{1,2})\s+de\s+([a-z]+)\b/))) {
    const day = Number(m[1]);
    const mon = MONTHS[stripAccents(m[2]!)];
    if (mon != null && day >= 1 && day <= 31) {
      const d = startOfDay(now);
      d.setMonth(mon, day);
      if (d.getTime() < startOfDay(now).getTime()) d.setFullYear(d.getFullYear() + 1);
      mark(m, d);
    }
  } else if ((m = lower.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/))) {
    const day = Number(m[1]);
    const mon = Number(m[2]) - 1;
    if (day >= 1 && day <= 31 && mon >= 0 && mon <= 11) {
      const d = startOfDay(now);
      d.setMonth(mon, day);
      if (m[3]) {
        const y = Number(m[3]);
        d.setFullYear(y < 100 ? 2000 + y : y);
      } else if (d.getTime() < startOfDay(now).getTime()) {
        d.setFullYear(d.getFullYear() + 1);
      }
      mark(m, d);
    }
  }

  // ---- combinar fecha + hora ----
  let dueAt: Date | null = null;
  if (dueDay) {
    dueAt = atHour(dueDay, timeHour ?? DEFAULT_HOUR, timeMin);
  } else if (timeHour != null) {
    // solo hora → hoy, o mañana si ya pasó
    let d = atHour(startOfDay(now), timeHour, timeMin);
    if (d.getTime() <= now.getTime()) d = new Date(d.getTime() + 86400000);
    dueAt = d;
    if (!dueText) dueText = raw.slice(0, 0); // sin texto de fecha explícito
  }

  // ---- título: quitar tramos reconocidos ----
  let title = raw;
  removals
    .sort((a, b) => b.start - a.start)
    .forEach((r) => {
      title = title.slice(0, r.start) + " " + title.slice(r.end);
    });
  title = title.replace(/\s{2,}/g, " ").replace(/\s+([,.;:])/g, "$1").trim();
  // limpiar conectores colgantes al final ("para", "el", "a las")
  title = title.replace(/\b(para|el|la|los|a las|a|de)\s*$/i, "").trim();

  return { title, dueAt, tags, dueSourceText: dueText && dueText.length ? dueText : null };
}
