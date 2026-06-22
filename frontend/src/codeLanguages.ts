export interface CodeLanguageInfo {
  id: string;
  label: string;
}

const EXT_LANG: Record<string, CodeLanguageInfo> = {
  js: { id: "javascript", label: "JavaScript" },
  mjs: { id: "javascript", label: "JavaScript" },
  cjs: { id: "javascript", label: "JavaScript" },
  jsx: { id: "javascript", label: "JSX" },
  ts: { id: "typescript", label: "TypeScript" },
  tsx: { id: "typescript", label: "TSX" },
  py: { id: "python", label: "Python" },
  pyw: { id: "python", label: "Python" },
  java: { id: "java", label: "Java" },
  kt: { id: "kotlin", label: "Kotlin" },
  kts: { id: "kotlin", label: "Kotlin" },
  html: { id: "xml", label: "HTML" },
  htm: { id: "xml", label: "HTML" },
  xhtml: { id: "xml", label: "HTML" },
  css: { id: "css", label: "CSS" },
  scss: { id: "scss", label: "SCSS" },
  sass: { id: "scss", label: "Sass" },
  less: { id: "less", label: "Less" },
  json: { id: "json", label: "JSON" },
  jsonc: { id: "json", label: "JSONC" },
  json5: { id: "json", label: "JSON5" },
  xml: { id: "xml", label: "XML" },
  yaml: { id: "yaml", label: "YAML" },
  yml: { id: "yaml", label: "YAML" },
  md: { id: "markdown", label: "Markdown" },
  markdown: { id: "markdown", label: "Markdown" },
  sh: { id: "bash", label: "Shell" },
  bash: { id: "bash", label: "Bash" },
  zsh: { id: "bash", label: "Zsh" },
  sql: { id: "sql", label: "SQL" },
  go: { id: "go", label: "Go" },
  rs: { id: "rust", label: "Rust" },
  c: { id: "c", label: "C" },
  h: { id: "c", label: "C Header" },
  cpp: { id: "cpp", label: "C++" },
  cc: { id: "cpp", label: "C++" },
  cxx: { id: "cpp", label: "C++" },
  hpp: { id: "cpp", label: "C++ Header" },
  cs: { id: "csharp", label: "C#" },
  php: { id: "php", label: "PHP" },
  rb: { id: "ruby", label: "Ruby" },
  swift: { id: "swift", label: "Swift" },
  dockerfile: { id: "dockerfile", label: "Dockerfile" },
  ini: { id: "ini", label: "INI" },
  toml: { id: "ini", label: "TOML" },
  env: { id: "ini", label: "ENV" },
  properties: { id: "properties", label: "Properties" },
  graphql: { id: "graphql", label: "GraphQL" },
  gql: { id: "graphql", label: "GraphQL" },
  lua: { id: "lua", label: "Lua" },
  r: { id: "r", label: "R" },
  pl: { id: "perl", label: "Perl" },
  pm: { id: "perl", label: "Perl" },
  ps1: { id: "powershell", label: "PowerShell" },
  scala: { id: "scala", label: "Scala" },
  dart: { id: "dart", label: "Dart" },
  vue: { id: "xml", label: "Vue" },
  svelte: { id: "xml", label: "Svelte" },
  makefile: { id: "makefile", label: "Makefile" },
  mk: { id: "makefile", label: "Makefile" },
  cmake: { id: "cmake", label: "CMake" },
  groovy: { id: "groovy", label: "Groovy" },
  gradle: { id: "groovy", label: "Gradle" },
  diff: { id: "diff", label: "Diff" },
  patch: { id: "diff", label: "Patch" },
  tf: { id: "ini", label: "Terraform" },
  proto: { id: "protobuf", label: "Protobuf" },
  ex: { id: "elixir", label: "Elixir" },
  exs: { id: "elixir", label: "Elixir" },
  erl: { id: "erlang", label: "Erlang" },
  hs: { id: "haskell", label: "Haskell" },
  vim: { id: "vim", label: "Vim" },
};

const MIME_LANG: Array<[RegExp, CodeLanguageInfo]> = [
  [/javascript|ecmascript/i, { id: "javascript", label: "JavaScript" }],
  [/typescript/i, { id: "typescript", label: "TypeScript" }],
  [/python/i, { id: "python", label: "Python" }],
  [/json/i, { id: "json", label: "JSON" }],
  [/xml|html/i, { id: "xml", label: "XML" }],
  [/yaml/i, { id: "yaml", label: "YAML" }],
  [/markdown/i, { id: "markdown", label: "Markdown" }],
  [/css/i, { id: "css", label: "CSS" }],
  [/sql/i, { id: "sql", label: "SQL" }],
  [/shell|bash|sh/i, { id: "bash", label: "Shell" }],
];

function fileExtension(originalName: string): string {
  return originalName.includes(".")
    ? originalName.slice(originalName.lastIndexOf(".") + 1).toLowerCase()
    : "";
}

export function getCodeLanguage(originalName: string, contentType?: string): CodeLanguageInfo {
  const ext = fileExtension(originalName);
  if (ext && EXT_LANG[ext]) return EXT_LANG[ext];

  const baseName = originalName.split("/").pop()?.toLowerCase() ?? "";
  if (baseName === "dockerfile") return EXT_LANG.dockerfile;
  if (baseName === "makefile") return EXT_LANG.makefile;

  const ct = contentType?.toLowerCase() ?? "";
  for (const [pattern, info] of MIME_LANG) {
    if (pattern.test(ct)) return info;
  }

  return { id: "plaintext", label: "Texto plano" };
}
