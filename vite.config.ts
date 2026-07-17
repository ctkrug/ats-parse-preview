/// <reference types="vitest" />
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Relative base so the built site works when hosted under a subpath
// (e.g. apps.charliekrug.com/ats-parse-preview), not just at a domain root.
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
  },
  test: {
    setupFiles: ["./tests/setup.ts"],
    // mammoth's npm "main" is a Node build that reads files via `path`/`buffer`;
    // the app (and its browser bundle, via package.json's "browser" field swap)
    // uses the `arrayBuffer` input the browser build expects. Point tests at that
    // same browser build directly so they exercise the code path production runs.
    alias: {
      mammoth: fileURLToPath(
        new URL("./node_modules/mammoth/mammoth.browser.js", import.meta.url),
      ),
    },
  },
});
