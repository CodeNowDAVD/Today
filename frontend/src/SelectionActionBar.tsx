import ToolbarIcon from "./ToolbarIcons";

type Props = {
  count: number;
  pdfCount: number;
  onPresent?: () => void;
  onCreateSession?: () => void;
  onTrash: () => void;
  onDone: () => void;
  /** Integrado en la command bar (arriba), no flotante abajo. */
  inline?: boolean;
};

export default function SelectionActionBar({
  count,
  pdfCount,
  onPresent,
  onCreateSession,
  onTrash,
  onDone,
  inline = false,
}: Props) {
  return (
    <div
      className={[
        "selection-action-bar",
        inline && "selection-action-bar--inline",
      ]
        .filter(Boolean)
        .join(" ")}
      role="toolbar"
      aria-label="Acciones de selección"
    >
      <span className="selection-action-bar__count">
        {count} seleccionado{count === 1 ? "" : "s"}
      </span>
      <div className="selection-action-bar__actions">
        {pdfCount > 0 && onPresent && (
          <button
            type="button"
            className="btn btn-compact selection-action-bar__btn"
            onClick={onPresent}
            title={`Presentar ${pdfCount} PDF${pdfCount === 1 ? "" : "s"}`}
          >
            Presentar
          </button>
        )}
        {pdfCount > 0 && onCreateSession && (
          <button
            type="button"
            className="btn btn-compact selection-action-bar__btn"
            onClick={onCreateSession}
            title={`Crear sesión con ${pdfCount} PDF${pdfCount === 1 ? "" : "s"}`}
          >
            Crear sesión
          </button>
        )}
        <button
          type="button"
          className="btn btn-compact danger selection-action-bar__btn"
          onClick={onTrash}
          aria-label={`Mover ${count} a eliminados`}
        >
          <ToolbarIcon name="trash" />
          <span>Eliminar</span>
        </button>
        <button type="button" className="btn btn-compact selection-action-bar__btn" onClick={onDone}>
          Listo
        </button>
      </div>
    </div>
  );
}
