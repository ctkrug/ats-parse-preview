import { defineConfig } from "vite";

// Relative base so the built site works when hosted under a subpath
// (e.g. apps.charliekrug.com/ats-parse-preview), not just at a domain root.
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
  },
});
