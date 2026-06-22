import { SidebarSearchIcon } from "./SidebarIcons";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function SidebarFolderSearch({ value, onChange, className }: Props) {
  return (
    <div className={["sidebar-folder-search-wrap", className].filter(Boolean).join(" ")}>
      <span className="sidebar-folder-search-icon" aria-hidden>
        <SidebarSearchIcon />
      </span>
      <input
        type="search"
        className="sidebar-folder-search"
        placeholder="Buscar"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Buscar carpetas"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}
