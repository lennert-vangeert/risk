import { defineConfig } from "vitest/config";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The engine is pure, framework-free TypeScript, so tests run in a plain Node
// environment. We re-declare the `@engine` alias here so test imports resolve
// exactly as they do in the app (vite.config.ts) and typechecker (tsconfig.json).
export default defineConfig({
  resolve: {
    alias: {
      "@engine": path.resolve(__dirname, "src/engine"),
    },
  },
  test: {
    environment: "node",
    include: ["src/engine/**/*.test.ts"],
  },
});
