import { useEffect, useId, useState } from "react";
import { suggestLifeTags } from "../api";

type Props = {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
};

export default function LifeTagInput({
  value,
  onChange,
  readOnly = false,
  placeholder = "curso:algebra, contexto:casa",
  className,
}: Props) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const lastToken = value.split(",").pop()?.trim() ?? "";

  useEffect(() => {
    if (readOnly) return;
    const timer = window.setTimeout(() => {
      void suggestLifeTags(lastToken)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [lastToken, readOnly]);

  function applySuggestion(tag: string) {
    const parts = value
      .split(",")
      .map((t) => t.trim())
      .filter((part, i, arr) => part.length > 0 || i < arr.length - 1);
    if (parts.length === 0) {
      onChange(tag);
    } else {
      parts[parts.length - 1] = tag;
      onChange(parts.join(", "));
    }
    setOpen(false);
  }

  const showSuggestions = open && !readOnly && suggestions.length > 0 && lastToken.length >= 0;

  return (
    <div className="life-tag-input">
      <input
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        readOnly={readOnly}
        list={readOnly ? undefined : listId}
        autoComplete="off"
      />
      {!readOnly && (
        <datalist id={listId}>
          {suggestions.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      )}
      {showSuggestions && (
        <ul className="life-tag-suggestions" role="listbox">
          {suggestions
            .filter((tag) => tag.toLowerCase().includes(lastToken.toLowerCase()))
            .slice(0, 8)
            .map((tag) => (
              <li key={tag}>
                <button type="button" onMouseDown={() => applySuggestion(tag)}>
                  {tag}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
