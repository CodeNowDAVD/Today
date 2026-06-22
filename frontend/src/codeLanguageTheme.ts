import { getFileBrand } from "./fileIconBrands";

export interface CodeLanguageTheme {
  accent: string;
  accentMuted: string;
  surface: string;
  surfaceDeep: string;
  glow: string;
  chromeFrom: string;
  chromeTo: string;
  keyword: string;
  string: string;
  number: string;
  function: string;
}

const BASE: Omit<CodeLanguageTheme, "accent" | "accentMuted" | "glow" | "chromeFrom" | "chromeTo"> = {
  surface: "#131316",
  surfaceDeep: "#0c0c0f",
  keyword: "#c792ea",
  string: "#c3e88d",
  number: "#f78c6c",
  function: "#82aaff",
};

const LANG_THEMES: Record<string, Partial<CodeLanguageTheme>> = {
  javascript: {
    accent: "#f7df1e",
    accentMuted: "rgba(247, 223, 30, 0.16)",
    glow: "rgba(247, 223, 30, 0.11)",
    chromeFrom: "#222018",
    chromeTo: "#131310",
    keyword: "#c792ea",
    function: "#ffcb6b",
  },
  typescript: {
    accent: "#3178c6",
    accentMuted: "rgba(49, 120, 198, 0.18)",
    glow: "rgba(49, 120, 198, 0.12)",
    chromeFrom: "#152232",
    chromeTo: "#0e1620",
    keyword: "#c792ea",
    function: "#82aaff",
  },
  python: {
    accent: "#ffd43b",
    accentMuted: "rgba(255, 212, 59, 0.16)",
    glow: "rgba(75, 139, 190, 0.14)",
    chromeFrom: "#1a1a10",
    chromeTo: "#101008",
    keyword: "#c792ea",
    string: "#c3e88d",
    function: "#82aaff",
  },
  java: {
    accent: "#5382a1",
    accentMuted: "rgba(83, 130, 161, 0.18)",
    glow: "rgba(83, 130, 161, 0.1)",
    chromeFrom: "#1a2228",
    chromeTo: "#101418",
  },
  kotlin: {
    accent: "#7f52ff",
    accentMuted: "rgba(127, 82, 255, 0.18)",
    glow: "rgba(127, 82, 255, 0.11)",
    chromeFrom: "#1c1830",
    chromeTo: "#12101c",
  },
  xml: {
    accent: "#e44d26",
    accentMuted: "rgba(228, 77, 38, 0.16)",
    glow: "rgba(228, 77, 38, 0.1)",
    chromeFrom: "#221612",
    chromeTo: "#140e0c",
    keyword: "#f07178",
    string: "#c3e88d",
  },
  css: {
    accent: "#2965f1",
    accentMuted: "rgba(41, 101, 241, 0.18)",
    glow: "rgba(41, 101, 241, 0.11)",
    chromeFrom: "#141c28",
    chromeTo: "#0c1018",
    keyword: "#c792ea",
    function: "#ffcb6b",
  },
  scss: {
    accent: "#cf649a",
    accentMuted: "rgba(207, 100, 154, 0.16)",
    glow: "rgba(207, 100, 154, 0.1)",
    chromeFrom: "#20141c",
    chromeTo: "#140c12",
  },
  json: {
    accent: "#f0ab00",
    accentMuted: "rgba(240, 171, 0, 0.16)",
    glow: "rgba(240, 171, 0, 0.09)",
    chromeFrom: "#1c1810",
    chromeTo: "#12100a",
    keyword: "#c792ea",
    number: "#f78c6c",
    string: "#c3e88d",
  },
  yaml: {
    accent: "#cb171e",
    accentMuted: "rgba(203, 23, 30, 0.16)",
    glow: "rgba(203, 23, 30, 0.09)",
    chromeFrom: "#1c1012",
    chromeTo: "#120a0c",
  },
  markdown: {
    accent: "#083fa1",
    accentMuted: "rgba(8, 63, 161, 0.18)",
    glow: "rgba(8, 63, 161, 0.1)",
    chromeFrom: "#101828",
    chromeTo: "#0a1018",
    keyword: "#82aaff",
    string: "#c3e88d",
  },
  bash: {
    accent: "#4eaa25",
    accentMuted: "rgba(78, 170, 37, 0.16)",
    glow: "rgba(78, 170, 37, 0.09)",
    chromeFrom: "#141c10",
    chromeTo: "#0c120a",
    keyword: "#c792ea",
    string: "#c3e88d",
  },
  sql: {
    accent: "#00758f",
    accentMuted: "rgba(0, 117, 143, 0.18)",
    glow: "rgba(0, 117, 143, 0.1)",
    chromeFrom: "#101c20",
    chromeTo: "#0a1214",
    keyword: "#c792ea",
    function: "#82aaff",
  },
  go: {
    accent: "#00add8",
    accentMuted: "rgba(0, 173, 216, 0.16)",
    glow: "rgba(0, 173, 216, 0.1)",
    chromeFrom: "#101c22",
    chromeTo: "#0a1216",
  },
  rust: {
    accent: "#dea584",
    accentMuted: "rgba(222, 165, 132, 0.16)",
    glow: "rgba(222, 165, 132, 0.09)",
    chromeFrom: "#1c1612",
    chromeTo: "#120e0c",
  },
  c: {
    accent: "#659ad2",
    accentMuted: "rgba(101, 154, 210, 0.16)",
    glow: "rgba(101, 154, 210, 0.1)",
    chromeFrom: "#141820",
    chromeTo: "#0c1014",
  },
  cpp: {
    accent: "#659ad2",
    accentMuted: "rgba(101, 154, 210, 0.16)",
    glow: "rgba(101, 154, 210, 0.1)",
    chromeFrom: "#141820",
    chromeTo: "#0c1014",
  },
  csharp: {
    accent: "#68217a",
    accentMuted: "rgba(104, 33, 122, 0.18)",
    glow: "rgba(104, 33, 122, 0.11)",
    chromeFrom: "#1a1220",
    chromeTo: "#100c14",
  },
  php: {
    accent: "#777bb4",
    accentMuted: "rgba(119, 123, 180, 0.18)",
    glow: "rgba(119, 123, 180, 0.1)",
    chromeFrom: "#181820",
    chromeTo: "#101014",
  },
  ruby: {
    accent: "#cc342d",
    accentMuted: "rgba(204, 52, 45, 0.16)",
    glow: "rgba(204, 52, 45, 0.1)",
    chromeFrom: "#1c1010",
    chromeTo: "#120a0a",
  },
  swift: {
    accent: "#f05138",
    accentMuted: "rgba(240, 81, 56, 0.16)",
    glow: "rgba(240, 81, 56, 0.1)",
    chromeFrom: "#1c1412",
    chromeTo: "#120c0a",
  },
  dockerfile: {
    accent: "#2496ed",
    accentMuted: "rgba(36, 150, 237, 0.16)",
    glow: "rgba(36, 150, 237, 0.1)",
    chromeFrom: "#101820",
    chromeTo: "#0a1016",
  },
  graphql: {
    accent: "#e535ab",
    accentMuted: "rgba(229, 53, 171, 0.16)",
    glow: "rgba(229, 53, 171, 0.1)",
    chromeFrom: "#1c1018",
    chromeTo: "#120a10",
  },
  plaintext: {
    accent: "#78909c",
    accentMuted: "rgba(120, 144, 156, 0.16)",
    glow: "rgba(120, 144, 156, 0.08)",
    chromeFrom: "#181818",
    chromeTo: "#101010",
  },
};

function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function themeFromBrand(bg: string, bgDark: string): CodeLanguageTheme {
  return {
    ...BASE,
    accent: bg,
    accentMuted: hexToRgba(bg, 0.16),
    glow: hexToRgba(bg, 0.11),
    chromeFrom: bgDark,
    chromeTo: BASE.surfaceDeep,
  };
}

function fileExtension(originalName: string): string {
  return originalName.includes(".")
    ? originalName.slice(originalName.lastIndexOf(".") + 1).toLowerCase()
    : "";
}

export function getCodeLanguageTheme(langId: string, fileName: string): CodeLanguageTheme {
  const partial = LANG_THEMES[langId] ?? LANG_THEMES.plaintext;
  const ext = fileExtension(fileName);
  const brand = getFileBrand(ext, "code");

  const fallback = themeFromBrand(brand.bg, brand.bgDark);
  return {
    ...fallback,
    ...partial,
    surface: partial.surface ?? BASE.surface,
    surfaceDeep: partial.surfaceDeep ?? BASE.surfaceDeep,
    keyword: partial.keyword ?? BASE.keyword,
    string: partial.string ?? BASE.string,
    number: partial.number ?? BASE.number,
    function: partial.function ?? BASE.function,
  };
}
