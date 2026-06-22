export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "sorbits.theme";
const listeners = new Set<() => void>();

function notifyThemeListeners() {
  listeners.forEach((listener) => listener());
}

export function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getThemePreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  return pref === "system" ? getSystemTheme() : pref;
}

export function applyTheme(pref: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(pref);
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.setAttribute("data-theme-pref", pref);
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

export function setThemePreference(pref: ThemePreference): ResolvedTheme {
  localStorage.setItem(STORAGE_KEY, pref);
  const resolved = applyTheme(pref);
  notifyThemeListeners();
  return resolved;
}

export function subscribeThemePreference(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  const unsubSystem = subscribeSystemTheme(onStoreChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    unsubSystem();
    window.removeEventListener("storage", onStorage);
  };
}

export function initTheme(): ResolvedTheme {
  return applyTheme(getThemePreference());
}

export function subscribeSystemTheme(onChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    if (getThemePreference() === "system") applyTheme("system");
    onChange();
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
