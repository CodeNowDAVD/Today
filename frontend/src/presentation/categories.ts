export type SessionCategory = {
  id: string;
  label: string;
  color: string;
};

export const SESSION_CATEGORIES: SessionCategory[] = [
  { id: "arquitectura", label: "Arquitectura", color: "#5e5ce6" },
  { id: "api", label: "API", color: "#30d158" },
  { id: "base-de-datos", label: "Base de datos", color: "#ff9f0a" },
  { id: "deploy", label: "Deploy", color: "#0a84ff" },
  { id: "infra", label: "Infra", color: "#bf5af2" },
];

export function getCategoryById(id: string | undefined): SessionCategory | null {
  if (!id) return null;
  return SESSION_CATEGORIES.find((c) => c.id === id) ?? null;
}
