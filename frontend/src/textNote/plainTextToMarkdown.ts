/**
 * Convierte texto plano (.text) a Markdown para la vista previa.
 * Si el contenido ya parece Markdown estructurado, se deja tal cual.
 */
export function plainTextToMarkdown(text: string): string {
  if (!text.trim()) return "";

  if (
    /^#{1,6}\s/m.test(text) ||
    /^```/m.test(text) ||
    /^\|.+\|/m.test(text) ||
    /^[-*+]\s/m.test(text) ||
    /^\d+\.\s/m.test(text)
  ) {
    return text;
  }

  return text
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trimEnd())
        .join("  \n"),
    )
    .join("\n\n");
}

export function defaultTextNoteName(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `nota-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.text`;
}

export function normalizeTextNoteFileName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return defaultTextNoteName();
  return trimmed.toLowerCase().endsWith(".text") ? trimmed : `${trimmed}.text`;
}
