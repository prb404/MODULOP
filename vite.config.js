import { defineConfig } from "vite";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "";
const githubPagesBase = repoName.endsWith(".github.io") ? "/" : `/${repoName}/`;

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? githubPagesBase : "./",
  build: {
    target: "esnext"
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
