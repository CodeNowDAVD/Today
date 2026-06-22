import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const cadViewerDist = resolve(rootDir, "node_modules/@mlightcad/cad-simple-viewer/dist");
const publicWorkersDir = resolve(rootDir, "public/cad-workers");
const pdfWorkerSrc = resolve(rootDir, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
const publicPdfWorker = resolve(rootDir, "public/pdf.worker.min.js");

const PDF_WORKER_PUBLIC = "/pdf.worker.min.js";

function fixPdfWorkerSrc(): Plugin {
  const replacements: [string, string][] = [
    ['"pdf.worker.mjs"', `"${PDF_WORKER_PUBLIC}"`],
    ["'pdf.worker.mjs'", `'${PDF_WORKER_PUBLIC}'`],
    ['"./pdf.worker.mjs"', `"${PDF_WORKER_PUBLIC}"`],
    ["'./pdf.worker.mjs'", `'${PDF_WORKER_PUBLIC}'`],
  ];

  function patch(code: string): string {
    let out = code;
    for (const [from, to] of replacements) {
      out = out.replaceAll(from, to);
    }
    return out;
  }

  return {
    name: "fix-pdf-worker-src",
    enforce: "post",
    transform(code) {
      if (!code.includes("pdf.worker.mjs")) return null;
      return { code: patch(code), map: null };
    },
    generateBundle(_, bundle) {
      for (const item of Object.values(bundle)) {
        if (item.type === "chunk") {
          item.code = patch(item.code);
        }
      }
    },
  };
}

function copyCadWorkers(): Plugin {
  return {
    name: "copy-cad-workers",
    buildStart() {
      if (!existsSync(cadViewerDist)) return;
      mkdirSync(publicWorkersDir, { recursive: true });
      for (const file of ["libredwg-parser-worker.js", "mtext-renderer-worker.js"]) {
        cpSync(resolve(cadViewerDist, file), resolve(publicWorkersDir, file));
      }
    },
  };
}

function copyPdfWorker(): Plugin {
  return {
    name: "copy-pdf-worker",
    buildStart() {
      if (!existsSync(pdfWorkerSrc)) return;
      mkdirSync(resolve(rootDir, "public"), { recursive: true });
      cpSync(pdfWorkerSrc, publicPdfWorker);
    },
  };
}

export default defineConfig({
  root: rootDir,
  plugins: [react(), copyCadWorkers(), copyPdfWorker(), fixPdfWorkerSrc()],
  resolve: {
    dedupe: ["pdfjs-dist"],
    alias: {
      "pdfjs-dist": resolve(rootDir, "node_modules/pdfjs-dist"),
    },
  },
  build: {
    outDir: resolve(rootDir, "../backend/src/main/resources/static"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(rootDir, "index.html"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8082",
      "/actuator": "http://127.0.0.1:8082",
    },
  },
});
