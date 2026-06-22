import { useSyncExternalStore } from "react";
import {
  getThemePreference,
  setThemePreference,
  subscribeThemePreference,
  type ThemePreference,
} from "./theme";

const OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: "light", label: "Claro" },
  { id: "system", label: "Auto" },
  { id: "dark", label: "Oscuro" },
];

function getSnapshot() {
  return getThemePreference();
}

type Props = {
  compact?: boolean;
  className?: string;
};

export default function ThemePicker({ compact = false, className = "" }: Props) {
  const pref = useSyncExternalStore(
    subscribeThemePreference,
    getSnapshot,
    () => "system" as ThemePreference,
  );

  return (
    <div
      className={["theme-picker", compact && "theme-picker--compact", className]
        .filter(Boolean)
        .join(" ")}
      role="group"
      aria-label="Apariencia"
    >
      {!compact && <span className="theme-picker-label">Apariencia</span>}
      <div className="theme-segmented">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={pref === opt.id ? "on" : ""}
            aria-pressed={pref === opt.id}
            onClick={() => setThemePreference(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
