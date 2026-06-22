import { useEffect, useMemo, useState } from "react";
import { fetchFileBlob, type FileItem } from "./api";

type Props = {
  file: FileItem;
};

type SheetData = {
  name: string;
  rows: string[][];
  totalRows: number;
  totalCols: number;
};

/** Topes de render para no congelar el navegador con hojas enormes. */
const MAX_ROWS = 2000;
const MAX_COLS = 100;

function columnLabel(index: number): string {
  let label = "";
  let n = index;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

export default function SpreadsheetPreviewPane({ file }: Props) {
  const [sheets, setSheets] = useState<SheetData[] | null>(null);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parseo 100% en el navegador (SheetJS) — cero carga al servidor.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSheets(null);
    setActive(0);

    (async () => {
      const [{ read, utils }, blob] = await Promise.all([
        import("xlsx"),
        fetchFileBlob(file.id, true),
      ]);
      if (cancelled) return;

      const buffer = await blob.arrayBuffer();
      if (cancelled) return;

      const workbook = read(new Uint8Array(buffer), { type: "array" });
      const parsed: SheetData[] = workbook.SheetNames.map((name) => {
        const ws = workbook.Sheets[name];
        const aoa = utils.sheet_to_json<unknown[]>(ws, {
          header: 1,
          raw: false,
          defval: "",
          blankrows: false,
        });
        const totalRows = aoa.length;
        const totalCols = aoa.reduce((max, row) => Math.max(max, row.length), 0);
        const rows = aoa.slice(0, MAX_ROWS).map((row) =>
          Array.from({ length: Math.min(totalCols, MAX_COLS) }, (_, c) => {
            const cell = row[c];
            return cell == null ? "" : String(cell);
          }),
        );
        return { name, rows, totalRows, totalCols };
      });

      if (!cancelled) {
        setSheets(parsed);
        setLoading(false);
      }
    })().catch((e) => {
      if (cancelled) return;
      setError(e instanceof Error ? e.message : "No se pudo abrir la hoja de cálculo.");
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [file.id]);

  const activeSheet = sheets?.[active] ?? null;
  const columnLabels = useMemo(() => {
    const cols = activeSheet?.rows.reduce((max, row) => Math.max(max, row.length), 0) ?? 0;
    return Array.from({ length: cols }, (_, i) => columnLabel(i));
  }, [activeSheet]);

  if (loading) {
    return (
      <div className="spreadsheet-pane">
        <p className="spreadsheet-pane__status">Abriendo hoja de cálculo…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="spreadsheet-pane">
        <p className="spreadsheet-pane__status spreadsheet-pane__status--error">{error}</p>
      </div>
    );
  }

  if (!sheets || sheets.length === 0 || !activeSheet) {
    return (
      <div className="spreadsheet-pane">
        <p className="spreadsheet-pane__status">Esta hoja de cálculo está vacía.</p>
      </div>
    );
  }

  const truncated = activeSheet.totalRows > MAX_ROWS || activeSheet.totalCols > MAX_COLS;

  return (
    <div className="spreadsheet-pane">
      <div className="spreadsheet-pane__scroll">
        <table className="spreadsheet-pane__table">
          <thead>
            <tr>
              <th className="spreadsheet-pane__corner" scope="col" />
              {columnLabels.map((label) => (
                <th key={label} className="spreadsheet-pane__col-head" scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeSheet.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th className="spreadsheet-pane__row-head" scope="row">
                  {rowIndex + 1}
                </th>
                {columnLabels.map((label, colIndex) => (
                  <td key={label} className="spreadsheet-pane__cell">
                    {row[colIndex] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {truncated && (
        <p className="spreadsheet-pane__notice">
          Mostrando {Math.min(activeSheet.totalRows, MAX_ROWS)} de {activeSheet.totalRows} filas
          {activeSheet.totalCols > MAX_COLS
            ? ` y ${MAX_COLS} de ${activeSheet.totalCols} columnas`
            : ""}
          . Descarga el archivo para verlo completo.
        </p>
      )}

      {sheets.length > 1 && (
        <div className="spreadsheet-pane__tabs" role="tablist" aria-label="Hojas">
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              type="button"
              role="tab"
              aria-selected={index === active}
              className={[
                "spreadsheet-pane__tab",
                index === active && "spreadsheet-pane__tab--active",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setActive(index)}
              title={sheet.name}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
