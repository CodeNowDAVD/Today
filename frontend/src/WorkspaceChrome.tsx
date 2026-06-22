import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: ReactNode;
  stats?: ReactNode;
  toolbar?: ReactNode;
  secondary?: ReactNode;
  progress?: ReactNode;
  banner?: ReactNode;
};

/** Cabecera unificada estilo Finder / ventana macOS para vistas de contenido. */
export default function WorkspaceChrome({
  title,
  subtitle,
  stats,
  toolbar,
  secondary,
  progress,
  banner,
}: Props) {
  return (
    <header className="workspace-chrome">
      <div className="workspace-chrome__primary">
        <div className="workspace-chrome__titles">
          <h1 className="workspace-chrome__title">{title}</h1>
          {subtitle ? <p className="workspace-chrome__subtitle">{subtitle}</p> : null}
        </div>
        {stats ? (
          <div className="workspace-chrome__stats" aria-live="polite">
            {stats}
          </div>
        ) : null}
      </div>
      {progress}
      {banner}
      {toolbar ? <div className="workspace-chrome__toolbar">{toolbar}</div> : null}
      {secondary ? <div className="workspace-chrome__secondary">{secondary}</div> : null}
    </header>
  );
}
