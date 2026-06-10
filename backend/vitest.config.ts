import { defineConfig } from "vitest/config";
import { config as loadEnv } from "dotenv";
import path from "path";

// Carga variables dummy para que config/env.ts (validación Zod) no falle al importarse
loadEnv({ path: path.resolve(__dirname, ".env.test") });

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    env: process.env as Record<string, string>,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/modules/**/*.service.ts"],
    },
  },
});
