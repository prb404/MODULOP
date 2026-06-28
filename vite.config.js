import { defineConfig } from "vite";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "";
const githubPagesBase = repoName.endsWith(".github.io") ? "/" : `/${repoName}/`;

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? githubPagesBase : "./",
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("three")) return "engine-three";
          if (id.includes("echarts") || id.includes("zrender")) return "engine-charts";
          if (id.includes("@toast-ui") || id.includes("@codemirror")) return "editor-richtext";
          if (id.includes("html-to-image")) return "export-image";
          if (id.includes("jszip")) return "portable-zip";
          if (id.includes("gridstack")) return "engine-grid";
          if (id.includes("marked") || id.includes("dompurify")) return "markdown";
          if (id.includes("emoji-picker")) return "emoji";
          return "vendor";
        }
      }
    }
  },
  esbuild: {
    target: "esnext"
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext"
    }
  }
});
