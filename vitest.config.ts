import { defineConfig } from "vitest/config";
import path from "node:path";

// Run with:  npx vitest run   (vitest is intentionally not a package.json
// dependency — the repo's lockfile is bun.lock, and this keeps deploys untouched.)
// Unit tests run in plain Node with every external system (ERPNext, DOKU,
// Expo) replaced by an in-memory fake — they never touch production.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
