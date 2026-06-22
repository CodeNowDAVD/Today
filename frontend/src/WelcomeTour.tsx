import { useState } from "react";

const STORAGE_KEY = "sorbits_welcome_131";

const STEPS = [
  {
    title: "Carpetas / Proyectos",
    body: "Crea carpetas en el menú lateral y agrupa tus archivos, como en Proyectos de ChatGPT. Sube directo a la carpeta que tengas abierta.",
  },
  {
    title: "Enlaces guardados",
    body: "En «Enlaces» ves todos tus URLs juntos. Guárdalos sueltos, opcionalmente con etiqueta, arrastra cada fila a un proyecto en la barra lateral y etiqueta arrastrando desde la bandeja.",
  },
  {
    title: "Iconos por tipo",
    body: "Cada archivo muestra un icono según su extensión (PDF, DWG, imágenes, etc.) para ubicarlo más rápido.",
  },
  {
    title: "Filtro por fecha (opcional)",
    body: "Por defecto ves todos tus archivos. Si pulsas «Filtrar por fecha», eliges un día en el calendario; «Ver todos ×» vuelve a la lista normal.",
  },
  {
    title: "Eliminados (30 días)",
    body: "Al borrar, el archivo pasa a «Eliminados» y permanece 30 días en el servidor. Puedes restaurarlo antes de que se borre del todo.",
  },
  {
    title: "OneDrive al instante",
    body: "Los cambios (subir, borrar, restaurar) sincronizan con OneDrive automáticamente, sin esperar un cron.",
  },
];

export function hasSeenWelcomeTour(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markWelcomeTourSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

type Props = {
  onDone: () => void;
};

export default function WelcomeTour({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function finish() {
    markWelcomeTourSeen();
    onDone();
  }

  return (
    <div className="tour-backdrop" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="tour-card">
        <p className="tour-kicker">Novedades en SOrbitS</p>
        <h2 id="tour-title" className="tour-title">
          {current.title}
        </h2>
        <p className="tour-body">{current.body}</p>
        <div className="tour-dots" aria-hidden>
          {STEPS.map((_, i) => (
            <span key={i} className={i === step ? "on" : ""} />
          ))}
        </div>
        <div className="tour-actions">
          <button type="button" className="btn ghost" onClick={finish}>
            Omitir
          </button>
          {!isLast ? (
            <button type="button" className="btn primary" onClick={() => setStep((s) => s + 1)}>
              Siguiente
            </button>
          ) : (
            <button type="button" className="btn primary" onClick={finish}>
              Empezar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
