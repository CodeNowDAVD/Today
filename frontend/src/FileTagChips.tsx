import type { FileTagItem } from "./api";

type Props = {
  tags: FileTagItem[];
  size?: "sm" | "md";
  removable?: boolean;
  onRemove?: (tagId: number) => void;
};

export default function FileTagChips({ tags, size = "sm", removable, onRemove }: Props) {
  if (!tags.length) return null;
  return (
    <span className={`file-tag-chips file-tag-chips--${size}`}>
      {tags.map((t) =>
        removable && onRemove ? (
          <button
            key={t.id}
            type="button"
            className="file-tag-chip file-tag-chip--removable"
            style={{ "--tag-color": t.color } as React.CSSProperties}
            title={`Quitar «${t.name}»`}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(t.id);
            }}
          >
            <span className="file-tag-chip-label">{t.name}</span>
            <span className="file-tag-chip-remove" aria-hidden>
              ×
            </span>
          </button>
        ) : (
          <span
            key={t.id}
            className="file-tag-chip"
            style={{ "--tag-color": t.color } as React.CSSProperties}
          >
            {t.name}
          </span>
        ),
      )}
    </span>
  );
}

export function fileTagsHoverLabel(tags: FileTagItem[]): string {
  return tags.map((t) => t.name).join(" · ");
}
