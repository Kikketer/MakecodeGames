import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // Route-group paths: /arcade is a standalone route outside the (main)
      // group, but shared code still imports games/extensions/auth via @/app/...
      // so resolve those to their real (main) location. More specific first.
      { find: "@/app/games", replacement: path.resolve(__dirname, "app/(main)/games") },
      { find: "@/app/extensions", replacement: path.resolve(__dirname, "app/(main)/extensions") },
      { find: "@/app/auth", replacement: path.resolve(__dirname, "app/(main)/auth") },
      { find: "@", replacement: path.resolve(__dirname) },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
