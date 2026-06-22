import hljs from "highlight.js/lib/core";
import type { LanguageFn } from "highlight.js";

type LangLoader = () => Promise<{ default: LanguageFn }>;

const LOADERS: Record<string, LangLoader> = {
  javascript: () => import("highlight.js/lib/languages/javascript"),
  typescript: () => import("highlight.js/lib/languages/typescript"),
  python: () => import("highlight.js/lib/languages/python"),
  java: () => import("highlight.js/lib/languages/java"),
  css: () => import("highlight.js/lib/languages/css"),
  scss: () => import("highlight.js/lib/languages/scss"),
  less: () => import("highlight.js/lib/languages/less"),
  xml: () => import("highlight.js/lib/languages/xml"),
  json: () => import("highlight.js/lib/languages/json"),
  yaml: () => import("highlight.js/lib/languages/yaml"),
  bash: () => import("highlight.js/lib/languages/bash"),
  markdown: () => import("highlight.js/lib/languages/markdown"),
  sql: () => import("highlight.js/lib/languages/sql"),
  go: () => import("highlight.js/lib/languages/go"),
  rust: () => import("highlight.js/lib/languages/rust"),
  c: () => import("highlight.js/lib/languages/c"),
  cpp: () => import("highlight.js/lib/languages/cpp"),
  csharp: () => import("highlight.js/lib/languages/csharp"),
  php: () => import("highlight.js/lib/languages/php"),
  ruby: () => import("highlight.js/lib/languages/ruby"),
  swift: () => import("highlight.js/lib/languages/swift"),
  kotlin: () => import("highlight.js/lib/languages/kotlin"),
  dockerfile: () => import("highlight.js/lib/languages/dockerfile"),
  ini: () => import("highlight.js/lib/languages/ini"),
  properties: () => import("highlight.js/lib/languages/properties"),
  graphql: () => import("highlight.js/lib/languages/graphql"),
  lua: () => import("highlight.js/lib/languages/lua"),
  r: () => import("highlight.js/lib/languages/r"),
  perl: () => import("highlight.js/lib/languages/perl"),
  powershell: () => import("highlight.js/lib/languages/powershell"),
  scala: () => import("highlight.js/lib/languages/scala"),
  dart: () => import("highlight.js/lib/languages/dart"),
  makefile: () => import("highlight.js/lib/languages/makefile"),
  cmake: () => import("highlight.js/lib/languages/cmake"),
  groovy: () => import("highlight.js/lib/languages/groovy"),
  diff: () => import("highlight.js/lib/languages/diff"),
  protobuf: () => import("highlight.js/lib/languages/protobuf"),
  elixir: () => import("highlight.js/lib/languages/elixir"),
  erlang: () => import("highlight.js/lib/languages/erlang"),
  haskell: () => import("highlight.js/lib/languages/haskell"),
  vim: () => import("highlight.js/lib/languages/vim"),
  plaintext: () => import("highlight.js/lib/languages/plaintext"),
};

const registered = new Set<string>();

async function ensureLanguage(langId: string): Promise<string> {
  const id = LOADERS[langId] ? langId : "plaintext";
  if (registered.has(id)) return id;

  const loader = LOADERS[id] ?? LOADERS.plaintext;
  const mod = await loader();
  hljs.registerLanguage(id, mod.default);
  registered.add(id);
  return id;
}

export interface HighlightedCode {
  html: string;
  lineCount: number;
  language: string;
}

export interface HighlightedCodeLines {
  lines: string[];
  lineCount: number;
  language: string;
}

export async function highlightCodeLines(code: string, langId: string): Promise<HighlightedCodeLines> {
  const language = await ensureLanguage(langId);
  const sourceLines = code === "" ? [""] : code.split("\n");
  const lines = sourceLines.map((line) => {
    const value = line || " ";
    return hljs.highlight(value, { language, ignoreIllegals: true }).value;
  });

  return { lines, lineCount: sourceLines.length, language };
}

export async function highlightCodeBlock(code: string, langId: string): Promise<HighlightedCode> {
  const language = await ensureLanguage(langId);
  const lineCount = code === "" ? 1 : code.split("\n").length;
  const html = hljs.highlight(code, { language, ignoreIllegals: true }).value;

  return { html, lineCount, language };
}
