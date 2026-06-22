export type FileBrandSvgId =
  | "javascript"
  | "typescript"
  | "react"
  | "html5"
  | "css"
  | "python"
  | "json"
  | "markdown"
  | "mdx"
  | "yaml"
  | "xml"
  | "java"
  | "shell"
  | "go"
  | "rust"
  | "php"
  | "ruby"
  | "swift"
  | "kotlin"
  | "docker"
  | "graphql"
  | "vim"
  | "dotnet"
  | "c"
  | "cpp"
  | "scala"
  | "dart"
  | "elixir"
  | "haskell"
  | "lua"
  | "perl"
  | "r"
  | "toml"
  | "svg-vector"
  | "pdf"
  | "image"
  | "text"
  | "word"
  | "excel"
  | "presentation"
  | "archive"
  | "video"
  | "audio"
  | "cad"
  | "file"
  | "csv"
  | "zip";

export type FileBrandMark = { type: "svg"; id: FileBrandSvgId; dark?: boolean };

export interface FileBrandStyle {
  bg: string;
  bgDark: string;
  mark: FileBrandMark;
}

const svg = (id: FileBrandSvgId, dark?: boolean): FileBrandMark => ({ type: "svg", id, dark });

const OFFICE_WORD: FileBrandStyle = {
  bg: "#185abd",
  bgDark: "#124890",
  mark: svg("word"),
};

const OFFICE_EXCEL: FileBrandStyle = {
  bg: "#107c41",
  bgDark: "#0c6234",
  mark: svg("excel"),
};

const OFFICE_PPT: FileBrandStyle = {
  bg: "#d24726",
  bgDark: "#ab3a1f",
  mark: svg("presentation"),
};

const IMAGE: FileBrandStyle = {
  bg: "#4a9fd4",
  bgDark: "#3888bc",
  mark: svg("image"),
};

const EXT_BRANDS: Record<string, FileBrandStyle> = {
  pdf: { bg: "#eb1000", bgDark: "#c40e00", mark: svg("pdf") },
  doc: OFFICE_WORD,
  docx: OFFICE_WORD,
  rtf: OFFICE_WORD,
  odt: { bg: "#18a303", bgDark: "#128502", mark: svg("word") },
  xls: OFFICE_EXCEL,
  xlsx: OFFICE_EXCEL,
  xlsm: OFFICE_EXCEL,
  xlsb: OFFICE_EXCEL,
  csv: { bg: "#107c41", bgDark: "#0c6234", mark: svg("csv") },
  tsv: { bg: "#107c41", bgDark: "#0c6234", mark: svg("csv") },
  ods: { bg: "#18a303", bgDark: "#128502", mark: svg("excel") },
  fods: { bg: "#18a303", bgDark: "#128502", mark: svg("excel") },
  ppt: OFFICE_PPT,
  pptx: OFFICE_PPT,
  odp: { bg: "#d24726", bgDark: "#ab3a1f", mark: svg("presentation") },
  png: IMAGE,
  jpg: IMAGE,
  jpeg: IMAGE,
  gif: IMAGE,
  webp: IMAGE,
  bmp: IMAGE,
  heic: IMAGE,
  avif: IMAGE,
  svg: { bg: "#ffb13b", bgDark: "#d9922f", mark: svg("svg-vector") },
  mp4: { bg: "#7c3aed", bgDark: "#6429c7", mark: svg("video") },
  webm: { bg: "#7c3aed", bgDark: "#6429c7", mark: svg("video") },
  mov: { bg: "#555555", bgDark: "#3d3d3d", mark: svg("video") },
  mkv: { bg: "#7c3aed", bgDark: "#6429c7", mark: svg("video") },
  avi: { bg: "#7c3aed", bgDark: "#6429c7", mark: svg("video") },
  mp3: { bg: "#1db954", bgDark: "#169443", mark: svg("audio") },
  wav: { bg: "#1db954", bgDark: "#169443", mark: svg("audio") },
  flac: { bg: "#1db954", bgDark: "#169443", mark: svg("audio") },
  ogg: { bg: "#1db954", bgDark: "#169443", mark: svg("audio") },
  m4a: { bg: "#fa233b", bgDark: "#c81c2f", mark: svg("audio") },
  zip: { bg: "#7b2082", bgDark: "#621a68", mark: svg("zip") },
  rar: { bg: "#7b2082", bgDark: "#621a68", mark: svg("archive") },
  "7z": { bg: "#0078d4", bgDark: "#005fa8", mark: svg("zip") },
  tar: { bg: "#7b2082", bgDark: "#621a68", mark: svg("archive") },
  gz: { bg: "#7b2082", bgDark: "#621a68", mark: svg("archive") },
  bz2: { bg: "#7b2082", bgDark: "#621a68", mark: svg("archive") },
  dwg: { bg: "#e51937", bgDark: "#b8142c", mark: svg("cad") },
  dxf: { bg: "#e51937", bgDark: "#b8142c", mark: svg("cad") },
  step: { bg: "#e51937", bgDark: "#b8142c", mark: svg("cad") },
  stp: { bg: "#e51937", bgDark: "#b8142c", mark: svg("cad") },
  js: { bg: "#f7df1e", bgDark: "#d4be12", mark: svg("javascript", true) },
  mjs: { bg: "#f7df1e", bgDark: "#d4be12", mark: svg("javascript", true) },
  cjs: { bg: "#f7df1e", bgDark: "#d4be12", mark: svg("javascript", true) },
  jsx: { bg: "#61dafb", bgDark: "#4ab0cc", mark: svg("react") },
  ts: { bg: "#3178c6", bgDark: "#26609f", mark: svg("typescript") },
  tsx: { bg: "#3178c6", bgDark: "#26609f", mark: svg("react") },
  html: { bg: "#e44d26", bgDark: "#b83e1f", mark: svg("html5") },
  htm: { bg: "#e44d26", bgDark: "#b83e1f", mark: svg("html5") },
  css: { bg: "#2965f1", bgDark: "#1f50c4", mark: svg("css") },
  scss: { bg: "#cf649a", bgDark: "#a84f7c", mark: svg("css") },
  less: { bg: "#1d365d", bgDark: "#152a49", mark: svg("css") },
  json: { bg: "#292929", bgDark: "#1a1a1a", mark: svg("json") },
  xml: { bg: "#ff6600", bgDark: "#cc5200", mark: svg("xml") },
  java: { bg: "#5382a1", bgDark: "#426882", mark: svg("java") },
  py: { bg: "#306998", bgDark: "#255378", mark: svg("python") },
  sh: { bg: "#4eaa25", bgDark: "#3d881d", mark: svg("shell") },
  bash: { bg: "#4eaa25", bgDark: "#3d881d", mark: svg("shell") },
  yml: { bg: "#cb171e", bgDark: "#a31218", mark: svg("yaml") },
  yaml: { bg: "#cb171e", bgDark: "#a31218", mark: svg("yaml") },
  md: { bg: "#083fa1", bgDark: "#063280", mark: svg("markdown") },
  mdx: { bg: "#083fa1", bgDark: "#063280", mark: svg("mdx") },
  txt: { bg: "#607d8b", bgDark: "#4d6570", mark: svg("text") },
  log: { bg: "#546e7a", bgDark: "#435862", mark: svg("text") },
  go: { bg: "#00add8", bgDark: "#0089ad", mark: svg("go") },
  rs: { bg: "#dea584", bgDark: "#b8846a", mark: svg("rust") },
  php: { bg: "#777bb4", bgDark: "#5f6292", mark: svg("php") },
  rb: { bg: "#cc342d", bgDark: "#a32923", mark: svg("ruby") },
  swift: { bg: "#f05138", bgDark: "#c0402c", mark: svg("swift") },
  kt: { bg: "#7f52ff", bgDark: "#6642cc", mark: svg("kotlin") },
  cs: { bg: "#68217a", bgDark: "#521a60", mark: svg("dotnet") },
  c: { bg: "#659ad2", bgDark: "#507ba8", mark: svg("c") },
  cpp: { bg: "#659ad2", bgDark: "#507ba8", mark: svg("cpp") },
  scala: { bg: "#dc322f", bgDark: "#b02825", mark: svg("scala") },
  dart: { bg: "#0175c2", bgDark: "#015d9b", mark: svg("dart") },
  ex: { bg: "#6e4a7e", bgDark: "#563b63", mark: svg("elixir") },
  hs: { bg: "#5d4f85", bgDark: "#4a3f6a", mark: svg("haskell") },
  lua: { bg: "#2c2d72", bgDark: "#23245b", mark: svg("lua") },
  pl: { bg: "#394867", bgDark: "#2d3952", mark: svg("perl") },
  r: { bg: "#276dc3", bgDark: "#1f57a0", mark: svg("r") },
  toml: { bg: "#9c4221", bgDark: "#7d351a", mark: svg("toml") },
  dockerfile: { bg: "#2496ed", bgDark: "#1d78be", mark: svg("docker") },
  graphql: { bg: "#e535ab", bgDark: "#b72a89", mark: svg("graphql") },
  vim: { bg: "#019733", bgDark: "#017929", mark: svg("vim") },
};

const KIND_FALLBACK: Record<string, FileBrandStyle> = {
  pdf: EXT_BRANDS.pdf,
  image: IMAGE,
  video: { bg: "#7c3aed", bgDark: "#6429c7", mark: svg("video") },
  audio: { bg: "#1db954", bgDark: "#169443", mark: svg("audio") },
  archive: { bg: "#7b2082", bgDark: "#621a68", mark: svg("archive") },
  cad: { bg: "#e51937", bgDark: "#b8142c", mark: svg("cad") },
  document: OFFICE_WORD,
  spreadsheet: OFFICE_EXCEL,
  presentation: OFFICE_PPT,
  code: { bg: "#3178c6", bgDark: "#26609f", mark: svg("typescript") },
  text: { bg: "#607d8b", bgDark: "#4d6570", mark: svg("text") },
  default: { bg: "#78909c", bgDark: "#607480", mark: svg("file") },
};

export function getFileBrand(ext: string, kind: string): FileBrandStyle {
  const key = ext.toLowerCase();
  if (key && EXT_BRANDS[key]) return EXT_BRANDS[key];
  if (KIND_FALLBACK[kind]) return KIND_FALLBACK[kind];
  return KIND_FALLBACK.default;
}
